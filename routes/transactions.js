//outes/transactions.js
import express from "express"; 
import { getTransactionByUserId } from "../controllers/transactionController.js";
import { deleteUserByUserId } from "../controllers/transactionController.js";
const router = express.Router();

// Get all transactions
router.get("/getAllUser", getTransactionByUserId);

//router.post()

router.delete("/:UserID",deleteUserByUserId)

export default router;