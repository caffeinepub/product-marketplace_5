import Map "mo:core/Map";

module {
  type OldCategory = {
    name : Text;
    subcategories : [Text];
    parent : ?Text;
  };

  type OldActor = {
    categories : Map.Map<Text, OldCategory>;
  };

  /// Run data migration for the canister upgrade.
  /// Ensures the "shape type" subcategory exists under the "3d print"
  public func run(old : OldActor) : { categories : Map.Map<Text, OldCategory> } {
    switch (old.categories.get("3d print")) {
      case (null) { old };
      case (?printCategory) {
        let hasShapeType = printCategory.subcategories.find(func(sub) { sub == "shape type" });
        switch (hasShapeType) {
          case (null) {
            let updatedSubcategories = printCategory.subcategories.concat(["shape type"]);
            let updatedPrintCategory = {
              printCategory with
              subcategories = updatedSubcategories
            };
            old.categories.add("3d print", updatedPrintCategory);
            old;
          };
          case (?_) { old }; // No change if already present
        };
      };
    };
  };
};
