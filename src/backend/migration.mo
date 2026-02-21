import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import List "mo:core/List";

import Store "blob-storage/Storage";
import Stripe "stripe/stripe";

module {
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

  public type PriceConstraint = {
    category : Text;
    minPrice : Text;
  };

  public type OldActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
    products : Map.Map<Text, Product>;
    categories : Map.Map<Text, CategoryV2>;
    baskets : Map.Map<Text, Map.Map<Text, Nat>>;
    priceConstraints : Map.Map<Text, PriceConstraint>;
    currentBatch : List.List<ProductInput>;
    isBatchUploading : Bool;
    stripeConfig : ?Stripe.StripeConfiguration;
    storeSettings : ?StoreSettings;
    admins : Map.Map<Principal, Bool>;
  };

  public type NewActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
    products : Map.Map<Text, Product>;
    categories : Map.Map<Text, CategoryV2>;
    baskets : Map.Map<Text, Map.Map<Text, Nat>>;
    priceConstraints : Map.Map<Text, PriceConstraint>;
    currentBatch : List.List<ProductInput>;
    isBatchUploading : Bool;
    stripeConfig : ?Stripe.StripeConfiguration;
    storeSettings : ?StoreSettings;
    admins : Map.Map<Principal, Bool>;
  };

  public func run(old : OldActor) : NewActor {
    old;
  };
};
