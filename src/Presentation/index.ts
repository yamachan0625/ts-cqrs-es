import { getApplication, startAPI } from "./api";
import { shoppingCartApi } from "./shoppingCart/api";

startAPI(getApplication(shoppingCartApi()));
