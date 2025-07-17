# 🤖 GynAI: AI-Powered Maternal Health Assistant (C-Section Prediction + Doctor RAG Chatbot)

## 📘 Final Year Project (FYP) Overview

**GynAI** is a mobile-first AI-powered health assistant built for gynecologists and pregnant women. Our core goal is to **predict the mode of delivery** (C-section vs. natural birth) based on patient-specific data using machine learning models.

In addition to prediction, the system offers a **Doctor-AI Chatbot** that uses **Retrieval-Augmented Generation (RAG)** to help doctors explore patient history in natural language. This fusion of predictive analytics and AI chat makes GynAI a proactive and intelligent maternal health solution.

---

## 🎯 Key Objectives

- 🤖 Predict C-section vs. normal delivery based on health data (e.g., gravida, BP, gestational age, prior history)
- 💬 Enable doctors to ask patient-specific questions using an LLM-powered chat assistant
- 📊 Provide a real-time AI agent to monitor and alert for clinical risks based on symptoms and vitals

---

## 🧱 System Architecture

### 1. **Frontend (Doctor + Patient Interfaces)**

- Built using **React Native** (via Expo)
- Key Screens:
  - Patient registration + history input
  - AI prediction result display
  - Doctor dashboard with RAG chatbot
  - Symptom input + alerts for patients

### 2. **Backend (API & Prediction Logic)**

- Built using **FastAPI (Python)**
- Modules:
  - ML model endpoint for delivery prediction
  - AI chat question-answer endpoint
  - Real-time agent for risk monitoring
  - Database APIs for storing patient data

### 3. **Prediction System**

- Input features:
  - Gravida, gestational age, BP, past C-section, etc.
- Output:
  - Probabilistic prediction: C-section or natural
- ML Models:
  - Logistic Regression / Decision Tree / XGBoost (select best-performing one)

### 4. **RAG-Based Doctor Chatbot**

- Built using **LangChain** or **LlamaIndex**
- Purpose:
  - Help doctors retrieve relevant insights from a patient’s history via natural language queries
- Sources:
  - Stored structured/unstructured patient data
  - General medical knowledge
- Example Q&A:
  - Q: “Has this patient had gestational diabetes before?”
  - A: “Yes, recorded in week 22 and treated with Metformin.”

---

## 🧪 Implementation Phases

### ✅ Phase 1: C-Section Prediction Module

- Create input form in React Native
- Train model on medical dataset (synthetic or real)
- Integrate ML model in FastAPI
- Display prediction in patient profile

### ✅ Phase 2: Real-Time Alert Agent (Risk Monitoring)

- Input: Patient symptoms and vitals
- Output: Alerts when dangerous thresholds are detected (e.g., high BP, fetal risk)
- Uses clinical rules + lightweight AI monitoring agent

### ✅ Phase 3: Doctor Chatbot Using RAG

#### 🔗 Flow:

1. Doctor selects a patient in the dashboard
2. Enters a question: _“Any signs of high BP in the last 2 weeks?”_
3. Backend:
   - Retrieves patient record chunks from Vector DB
   - Sends to GPT via LangChain pipeline
   - Returns structured, cited response

#### 💬 Prompt Example:
```txt
You are an AI assistant helping a gynecologist understand a patient’s condition.
Doctor's Question: {question}
Patient Record:
{context_chunks}
Answer clearly, citing relevant details from patient data + medical knowledge.
