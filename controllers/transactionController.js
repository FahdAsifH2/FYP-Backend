// controllers/transactionController.js
import { sql } from '../db.js';

export async function getTransactionByUserId(req, res) {
    try {
        // ✅ FIXED: Changed from sql() to sql.query() and fixed variable naming
        const result = await sql.query("SELECT * FROM transactions");
        res.status(200).json(result);
    } catch (error) { // ✅ FIXED: Changed 'e' to 'error' for clarity
        console.error("Error fetching transactions:", error);
        res.status(500).json({ message: "Failed to fetch transactions" }); // ✅ FIXED: Changed to 500 for server errors
    }
}


export async function deleteUserByUserId(req,res)
{
  const {UserID} = req.params

  try
  {
      const resultDeleted=await sql`DELETE FROM transactions WHERE user_id = ${UserID} RETURNING *`


      if(resultDeleted.length === 0)
      {
        res.status(404).json({message:"No user was found"})
      }

      else
      {
        res.status(200).json({message:"User was deleted sucessfully"})
      }
  }
  catch(e)
  {
    res.status(400).json({message:"Failed to delete User by ID"})
    console.log(e.message)
  }

}


