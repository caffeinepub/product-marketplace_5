import Stripe "stripe/stripe";
import AccessControl "authorization/access-control";
import Iter "mo:core/Iter";
import Store "blob-storage/Storage";
import Map "mo:core/Map";
import List "mo:core/List";
import OutCall "http-outcalls/outcall";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinStorage "blob-storage/Mixin";
import MixinAuthorization "authorization/MixinAuthorization";
import Nat "mo:core/Nat";
import Migration "migration";

(with migration = Migration.run)
actor {
  include MixinStorage();
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type Currency = {
    #usd;
    #eur;
    #gbp;
    #cad;
    #aud;
  };

  public type StoreSettings = {
    storeName : Text;
    storeDescription : Text;
    contactEmail : Text;
    currency : Currency;
    taxRate : Float;
  };

  public type CategoryV2 = {
    name : Text;
    subcategories : [Text];
    parent : ?Text;
  };

  public type Category = CategoryV2;

  public type UserProfile = {
    name : Text;
  };

  public type Product = {
    id : Text;
    name : Text;
    description : Text;
    price : Nat;
    categoryId : Text;
    image : Store.ExternalBlob;
  };

  public type ProductInput = {
    id : Text;
    name : Text;
    price : Nat;
    categoryId : Text;
    image : Store.ExternalBlob;
  };

  public type BasketItem = {
    productId : Text;
    quantity : Nat;
  };

  public type PriceConstraint = {
    category : Text;
    minPrice : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let products = Map.empty<Text, Product>();
  var categories = Map.empty<Text, Category>();
  let baskets = Map.empty<Text, Map.Map<Text, Nat>>();
  let priceConstraints = Map.empty<Text, PriceConstraint>();
  let currentBatch = List.empty<ProductInput>();
  var isBatchUploading = false;
  var stripeConfig : ?Stripe.StripeConfiguration = null;
  var storeSettings : ?StoreSettings = null;
  let admins = Map.empty<Principal, Bool>();

  // Store settings management
  public shared ({ caller }) func updateStoreSettings(newSettings : StoreSettings) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update store settings");
    };
    storeSettings := ?newSettings;
  };

  public query func getStoreSettings() : async ?StoreSettings {
    storeSettings;
  };

  /// Only called on init
  public shared ({ caller }) func createDefaultCategoriesAndPriceConstraints() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can initialize defaults");
    };

    // Create default categories
    let ceramicCategory : Category = {
      name = "Ceramic Ocarina";
      subcategories = [];
      parent = null;
    };
    let printedCategory : Category = {
      name = "3D Printed Ocarina";
      subcategories = [];
      parent = null;
    };
    categories.add(ceramicCategory.name, ceramicCategory);
    categories.add(printedCategory.name, printedCategory);

    // Create default price constraints
    let ceramicPrice : PriceConstraint = {
      category = "Ceramic Ocarina";
      minPrice = "19";
    };
    let printedPrice : PriceConstraint = {
      category = "3D Printed Ocarina";
      minPrice = "9";
    };
    priceConstraints.add(ceramicPrice.category, ceramicPrice);
    priceConstraints.add(printedPrice.category, printedPrice);
  };

  // User profile management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Category management
  public shared ({ caller }) func addCategory(category : CategoryV2) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add categories");
    };

    if (category.name.size() == 0) {
      Runtime.trap("Cannot add empty category name");
    };

    if (categories.containsKey(category.name)) {
      Runtime.trap("Category already exists");
    };

    switch (category.parent) {
      case (?parentName) {
        switch (categories.get(parentName)) {
          case (null) {
            Runtime.trap("Parent category does not exist. Please select a valid parent category or leave the parent field empty.");
          };
          case (?parentCategory) {
            if (parentCategory.parent != null) {
              Runtime.trap("Cannot create a subcategory within a subcategory. Only one level of subcategories is supported.");
            };
            updateParentWithNewSubcategory(parentCategory, category.name);
          };
        };
      };
      case (null) {};
    };

    categories.add(category.name, category);
    true;
  };

  func updateParentWithNewSubcategory(parent : CategoryV2, childName : Text) {
    let updatedSubcategories = parent.subcategories.concat([childName]);
    let updatedParent = {
      parent with
      subcategories = updatedSubcategories
    };
    categories.add(parent.name, updatedParent);
  };

  public shared ({ caller }) func updateCategory(category : Category) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update categories");
    };

    if (category.name.size() == 0) {
      Runtime.trap("Cannot update a category to an empty name");
    };

    if (not categories.containsKey(category.name)) {
      Runtime.trap("Category does not exist, cannot be updated");
    };

    // Validate parent-child relationship
    switch (category.parent) {
      case (?parentName) {
        // Check if parent exists
        switch (categories.get(parentName)) {
          case (null) {
            Runtime.trap("Parent category does not exist. Please select a valid parent category or leave the parent field empty.");
          };
          case (?parentCategory) {
            // Prevent nested subcategories (subcategory within subcategory)
            if (parentCategory.parent != null) {
              Runtime.trap("Cannot create a subcategory within a subcategory. Only one level of subcategories is supported.");
            };

            // Update parent's subcategories list if this category is not already listed
            let alreadyListed = parentCategory.subcategories.find(func(sub : Text) : Bool { sub == category.name });
            switch (alreadyListed) {
              case (null) {
                // Add this category to parent's subcategories
                updateParentWithNewSubcategory(parentCategory, category.name);
              };
              case (?_) {
                // Already listed, no need to update parent
              };
            };
          };
        };
      };
      case (null) {
        // No parent - this is a top-level category
        // Remove this category from any previous parent's subcategories list
        for ((parentName, parentCategory) in categories.entries()) {
          let hasThisAsSubcategory = parentCategory.subcategories.find(func(sub : Text) : Bool { sub == category.name });
          switch (hasThisAsSubcategory) {
            case (?_) {
              // Remove from parent's subcategories
              let updatedSubcategories = parentCategory.subcategories.filter(func(sub : Text) : Bool { sub != category.name });
              let updatedParent = {
                parentCategory with
                subcategories = updatedSubcategories
              };
              categories.add(parentName, updatedParent);
            };
            case (null) {};
          };
        };
      };
    };

    categories.add(category.name, category);
  };

  public query func getCategories() : async [CategoryV2] {
    categories.values().toArray();
  };

  public query func getCategory(name : Text) : async ?CategoryV2 {
    categories.get(name);
  };

  public shared ({ caller }) func editCategory(oldName : Text, newCategory : Category) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can edit categories");
    };

    if (newCategory.name.size() == 0) {
      Runtime.trap("Cannot update a category to an empty name");
    };

    if (not categories.containsKey(oldName)) {
      Runtime.trap("Category does not exist, cannot be edited");
    };

    // Validate parent-child relationship for the new category
    switch (newCategory.parent) {
      case (?parentName) {
        switch (categories.get(parentName)) {
          case (null) {
            Runtime.trap("Parent category does not exist. Please select a valid parent category or leave the parent field empty.");
          };
          case (?parentCategory) {
            if (parentCategory.parent != null) {
              Runtime.trap("Cannot create a subcategory within a subcategory. Only one level of subcategories is supported.");
            };
          };
        };
      };
      case (null) {};
    };

    categories.remove(oldName);
    categories.add(newCategory.name, newCategory);
  };

  public shared ({ caller }) func deleteCategory(name : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete categories");
    };

    if (not categories.containsKey(name)) {
      Runtime.trap("Category does not exist, cannot be deleted");
    };

    categories.remove(name);
  };

  public shared ({ caller }) func reorderCategories(categoryList : [CategoryV2]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unathorized: Only admins can reorder categories");
    };

    let newCategoryMap = Map.empty<Text, CategoryV2>();
    for (category in categoryList.values()) {
      newCategoryMap.add(category.name, category);
    };
    categories := newCategoryMap;
  };

  // Product batch upload management
  public shared ({ caller }) func startBatchUpload(categoryId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    if (not categories.containsKey(categoryId)) {
      Runtime.trap("Invalid category! Please select an existing category.");
    } else if (isBatchUploading) {
      Runtime.trap("A batch is already in progress. Finish current upload before starting a new one.");
    } else {
      currentBatch.clear();
      isBatchUploading := true;
    };
  };

  public shared ({ caller }) func uploadProductImage(name : Text, image : Store.ExternalBlob, price : Nat, categoryId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    if (not isBatchUploading) {
      Runtime.trap("No batch in progress. Start a new batch upload first.");
    };
    let productId = name.concat("#").concat(products.size().toText());
    currentBatch.add({
      id = productId;
      name;
      price;
      image;
      categoryId;
    });
  };

  public shared ({ caller }) func finishBatchUpload() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    for (p in currentBatch.values()) {
      switch (categories.get(p.categoryId)) {
        case (null) {
          Runtime.trap("Category does not exist");
        };
        case (?category) {
          var description = generateProductDescription(p.name, category.name);
          let product : Product = {
            p with
            description
          };
          products.add(product.id, product);
        };
      };
    };
    isBatchUploading := false;
  };

  // Add single product
  public shared ({ caller }) func addProduct(name : Text, price : Nat, image : Store.ExternalBlob, categoryId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add products");
    };
    switch (categories.get(categoryId)) {
      case (null) {
        Runtime.trap("Category does not exist");
      };
      case (?category) {
        var description = generateProductDescription(name, category.name);
        let productId = name.concat("#").concat(products.size().toText());
        let product : Product = {
          id = productId;
          name;
          description;
          price;
          image;
          categoryId;
        };
        products.add(productId, product);
      };
    };
  };

  // Product browsing
  public query func getAllProducts() : async [Product] {
    products.values().toArray();
  };

  public query func getProduct(productId : Text) : async ?Product {
    products.get(productId);
  };

  // Stripe Integration
  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    stripeConfig := ?config;
  };

  public query func isStripeConfigured() : async Bool {
    stripeConfig != null;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfig) {
      case (null) { Runtime.trap("Stripe needs to be first configured") };
      case (?config) { config };
    };
  };

  public shared ({ caller }) func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check session status");
    };
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create checkout sessions");
    };
    await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Basket management
  public shared ({ caller }) func addToBasket(productId : Text, quantity : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add to basket");
    };

    let principal = caller.toText();
    if (not products.containsKey(productId)) {
      Runtime.trap("Product does not exist. Cannot add to basket.");
    };

    let basket = switch (baskets.get(principal)) {
      case (null) { Map.empty<Text, Nat>() };
      case (?existing) { existing };
    };
    basket.add(productId, quantity);
    baskets.add(principal, basket);
  };

  public query ({ caller }) func getBasket() : async [BasketItem] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can retrieve their basket");
    };

    switch (baskets.get(caller.toText())) {
      case (null) { [] };
      case (?basket) {
        basket.toArray().map(func((productId, quantity)) { { productId; quantity } });
      };
    };
  };

  public shared ({ caller }) func clearBasket() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can clear their basket");
    };
    baskets.remove(caller.toText());
  };

  public shared ({ caller }) func removeFromBasket(productId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove items from basket");
    };

    let principal = caller.toText();
    switch (baskets.get(principal)) {
      case (null) {
        Runtime.trap("Basket is already empty");
      };
      case (?basket) {
        if (not products.containsKey(productId)) {
          Runtime.trap("Product does not exist. Cannot remove from basket.");
        };
        basket.remove(productId);
        baskets.add(principal, basket);
      };
    };
  };

  // Admin management functions
  public shared ({ caller }) func addAdmin(admin : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can add other admins");
    };
    // Use AccessControl.assignRole to properly assign admin role
    AccessControl.assignRole(accessControlState, caller, admin, #admin);
    admins.add(admin, true);
  };

  public shared ({ caller }) func removeAdmin(admin : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can remove admins");
    };
    if (not admins.containsKey(admin)) {
      Runtime.trap("Admin does not exist, cannot be removed");
    };
    // Demote to user role instead of removing entirely
    AccessControl.assignRole(accessControlState, caller, admin, #user);
    admins.remove(admin);
  };

  public query ({ caller }) func getAdmins() : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view the admin list");
    };
    admins.keys().toArray();
  };

  // Automatic description generation
  func generateProductDescription(name : Text, category : Text) : Text {
    let baseDescription = name.concat(" is a high-quality, handcrafted musical instrument.");

    let categorySpecific = switch (category) {
      case ("Ceramic Ocarina") {
        " This ceramic ocarina features a classic design, producing rich and warm tones. It is perfect for both beginners and professionals looking for an authentic sound experience.";
      };
      case ("3D Printed Ocarina") {
        " This 3D printed ocarina combines modern design with durability, offering a lightweight and robust instrument. Ideal for musicians seeking innovative and reliable performance.";
      };
      case (_) { " This product is crafted with care, ensuring excellent sound quality and playability." };
    };

    "The product named ".concat(name).concat(" is in the category of ").concat(category).concat(".").concat("\n - Characteristics: Easy to play, Durable, Portable.\n - 30-day money-back guarantee for all products in this category \n\n").concat(baseDescription).concat(categorySpecific);
  };

  public func getPriceConstraint(category : Text) : async ?PriceConstraint {
    priceConstraints.get(category);
  };

  public shared ({ caller }) func updateProductImage(productId : Text, newImage : Store.ExternalBlob) : async Product {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update product images");
    };

    switch (products.get(productId)) {
      case (null) {
        Runtime.trap("Product does not exist. Cannot update image.");
      };
      case (?product) {
        let updatedProduct = {
          product with
          image = newImage;
        };
        products.add(productId, updatedProduct);
        updatedProduct;
      };
    };
  };
};
