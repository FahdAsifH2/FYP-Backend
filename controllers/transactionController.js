// controllers/transactionController.js
import { sql } from "../db.js";

export async function getTransactionByUserId(req, res) {
  try {
    // ✅ FIXED: Changed from sql() to sql.query() and fixed variable naming
    const result = await sql.query("SELECT * FROM transactions");
    res.status(200).json(result);
  } catch (error) {
    // ✅ FIXED: Changed 'e' to 'error' for clarity
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Failed to fetch transactions" }); // ✅ FIXED: Changed to 500 for server errors
  }
}

export async function deleteUserByUserId(req, res) {
  const { UserID } = req.params;

  try {
    const resultDeleted =
      await sql`DELETE FROM transactions WHERE user_id = ${UserID} RETURNING *`;

    if (resultDeleted.length === 0) {
      res.status(404).json({ message: "No user was found" });
    } else {
      res.status(200).json({ message: "User was deleted sucessfully" });
    }
  } catch (e) {
    res.status(400).json({ message: "Failed to delete User by ID" });
    console.log(e.message);
  }
}

export async function PredictPregnancy(req, res) {


  try
  {
   const data = req.body

   const FastApiResponse=await  fetch('http://localhost:8000/predict',{
    method: 'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(data)
   })

   console.log(data)

   if(FastApiResponse!=200 || FastApiResponse!=201)
   {
    const errorResp = await FastApiResponse.text()
    res.status(500).json({message: errorResp})
   }
   else
   {
    const Done = await FastApiResponse.text()
    res.status(200).json({message:"done"})
   }
  }
  catch(e)
  {
    console.error(e)
    res.status(500).json(e)
  }
  // console.log("worked");
  // const data = req.body;
  // console.log(data);

  // const {
  //   age_years,

  //   parity,
  //   gestation_weeks,
  //   previous_cs_count,
  //   gravida,
  //   robson_group,
  //   age_19_or_less,
  //   age_20_34_years,
  //   age_35_plus_years,
  //   robson_nulliparous,
  //   robson_multiparous,
  //   presentation_cephalic,
  //   presentation_breech,
  //   labour_onset_spontaneous,
  //   induction_of_labour,
  //   cs_before_labour,
  //   fetal_heart_present,
  //   single_baby,
  //   multiple_babies,
  //   number_of_fetuses,
  //   term_37_41_weeks,
  //   no_previous_scar,
  //   previous_scar,
  // } = req.body;

  // res.status(200);
}
