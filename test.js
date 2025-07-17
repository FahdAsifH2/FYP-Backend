const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BASE_URL="https://localhost:5001"
const ENDPOINT="/api/transactions"

async function testGetTransction(name,email)
{
    const url = `${BASE_URL}${ENDPOINT}?name={encodeURIComponent(name)}&email=${encodeURIComponent(email)}`

}