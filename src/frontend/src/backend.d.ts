import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface UserProfile {
    name: string;
}
export interface Category {
    name: string;
    subcategories: Array<string>;
    parent?: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface StoreSettings {
    currency: Currency;
    storeName: string;
    contactEmail: string;
    storeDescription: string;
    taxRate: number;
}
export interface PriceConstraint {
    category: string;
    minPrice: string;
}
export interface CategoryV2 {
    name: string;
    subcategories: Array<string>;
    parent?: string;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface BasketItem {
    productId: string;
    quantity: bigint;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface Product {
    id: string;
    categoryId: string;
    name: string;
    description: string;
    image: ExternalBlob;
    price: bigint;
}
export enum Currency {
    aud = "aud",
    cad = "cad",
    eur = "eur",
    gbp = "gbp",
    usd = "usd"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addAdmin(admin: Principal): Promise<void>;
    addCategory(category: CategoryV2): Promise<boolean>;
    addProduct(name: string, price: bigint, image: ExternalBlob, categoryId: string): Promise<void>;
    addToBasket(productId: string, quantity: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearBasket(): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    /**
     * / Only called on init
     */
    createDefaultCategoriesAndPriceConstraints(): Promise<void>;
    deleteCategory(name: string): Promise<void>;
    editCategory(oldName: string, newCategory: Category): Promise<void>;
    finishBatchUpload(): Promise<void>;
    getAdmins(): Promise<Array<Principal>>;
    getAllProducts(): Promise<Array<Product>>;
    getBasket(): Promise<Array<BasketItem>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCategories(): Promise<Array<CategoryV2>>;
    getCategory(name: string): Promise<CategoryV2 | null>;
    getPriceConstraint(category: string): Promise<PriceConstraint | null>;
    getProduct(productId: string): Promise<Product | null>;
    getStoreSettings(): Promise<StoreSettings | null>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    removeAdmin(admin: Principal): Promise<void>;
    removeFromBasket(productId: string): Promise<void>;
    reorderCategories(categoryList: Array<CategoryV2>): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    startBatchUpload(categoryId: string): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateCategory(category: Category): Promise<void>;
    updateStoreSettings(newSettings: StoreSettings): Promise<void>;
    uploadProductImage(name: string, image: ExternalBlob, price: bigint, categoryId: string): Promise<void>;
}
