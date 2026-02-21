import Map "mo:core/Map";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Store "blob-storage/Storage";

module {
  type Product = {
    id : Text;
    name : Text;
    description : Text;
    price : Nat;
    categoryId : Text;
    image : Store.ExternalBlob;
  };

  type ProductInput = {
    id : Text;
    name : Text;
    price : Nat;
    categoryId : Text;
    image : Store.ExternalBlob;
  };

  type CategoryV2 = {
    name : Text;
    subcategories : [Text];
    parent : ?Text;
  };

  type BasketItem = {
    productId : Text;
    quantity : Nat;
  };

  type PriceConstraint = {
    category : Text;
    minPrice : Text;
  };

  type Currency = {
    #usd;
    #eur;
    #gbp;
    #cad;
    #aud;
  };

  type StoreSettings = {
    storeName : Text;
    storeDescription : Text;
    contactEmail : Text;
    currency : Currency;
    taxRate : Float;
  };

  type UserProfile = {
    name : Text;
  };

  type OldActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
    products : Map.Map<Text, Product>;
    categories : Map.Map<Text, CategoryV2>;
    baskets : Map.Map<Text, Map.Map<Text, Nat>>;
    priceConstraints : Map.Map<Text, PriceConstraint>;
    currentBatch : List.List<ProductInput>;
    isBatchUploading : Bool;
    stripeConfig : ?{ secretKey : Text; allowedCountries : [Text] };
    storeSettings : ?StoreSettings;
    admins : Map.Map<Principal, Bool>;
  };

  public func run(old : OldActor) : OldActor {
    old;
  };
}
