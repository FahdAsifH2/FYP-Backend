import neo4j from "neo4j-driver";
import dotenv from "dotenv";
dotenv.config();

let driver;

export function getNeo4jDriver() {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
    );
  }
  return driver;
}

export function getSession() {
  return getNeo4jDriver().session({
    database: process.env.NEO4J_DATABASE || "neo4j",
  });
}

export async function testNeo4jConnection() {
  const session = getSession();
  try {
    await session.run("RETURN 1");
    console.log("✅ Neo4j connected successfully");
  } catch (err) {
    console.error("❌ Neo4j connection failed:", err.message);
  } finally {
    await session.close();
  }
}

export async function closeNeo4jDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
