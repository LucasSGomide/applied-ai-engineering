## **Exercise 2: Gym Performance Predictor**

### **The Problem**

You want a network that learns **your personal strength progression**. Given:
- What weight you lifted last session
- How many reps you completed
- How you felt that day (easy/medium/hard)

It predicts: **Your recommended weight for the next session** (for all 3 exercises).
---

### **Your Goals**

**Phase 1: Synthetic Data Creation**
- [X] Create 12-15 realistic training sessions following the progression logic above
- [X] Each session has 3 exercises with weight, reps, and feeling
- [X] Store in a JavaScript array/object structure

**Phase 2: Data Preparation**
- [X] Normalize numeric values (weights and reps) to 0-1 range
- [X] One-hot encode the "feeling" for each exercise (easy/medium/hard)
- [X] Create input tensor (14 sessions × 15 features)
- [X] Create output tensor (14 sessions × 3 weights + 3 reps)
- [X] Print both to verify structure

**Phase 3: Build & Train Network**
- [X] Input layer: 15 features
- [X] Hidden layer: 32 neurons with ReLU
- [X] **Output layer: 3 neurons (NO activation function)** ⭐
  - *Why no activation? Regression outputs unbounded numbers, not probabilities*
- [X] Compile with:
  - Loss: `meanSquaredError` (not categoricalCrossentropy!)
  - Optimizer: `adam`
  - Metrics: `mae` (mean absolute error - easier to read than loss)

**Phase 4: Train**
- [X] Train for 500+ epochs (regression needs more iterations)
- [X] Monitor loss/metrics to see it decreasing
- [X] Show the final metrics

**Phase 5: Predict**
- [X] Create a new session the network hasn't seen
- [X] Example: "I benched 105kg for 8 reps and felt easy"
- [X] Predict the recommended next weights
- [X] Verify it makes sense (should suggest increases for all three)
  - A: It does make sense based in our mocked data, but not for real world.

---

### **Key Concepts to Understand**

1. **Why no activation on output layer for regression?**
   - Classification needs softmax to convert to probabilities
   - Regression needs **raw unbounded numbers** (weights can be 100kg, 200kg, 10kg, etc.)
   - Raw output = best for regression

2. **Why MSE instead of Cross-Entropy?**
   - Cross-Entropy measures probability accuracy
   - MSE measures how far your number is from the true number
   - Perfect for: "I predicted 102kg, actual was 102.5kg"

3. **MAE vs MSE metrics:**
   - MSE: Penalizes big errors more (squared)
   - MAE: Average absolute error, easier to interpret
   - If MAE = 1.2, it means your predictions are off by ~1.2kg on average

4. **Why more epochs for regression?**
   - Regression has infinite possible outputs, needs more learning
   - Classification has finite categories, learns faster

---

### **Success Criteria**

- ✅ Code runs without errors
- ✅ Loss/MAE decreases over epochs
- ✅ When you predict "easy session, high reps" → suggests weight increases
- ✅ When you predict "hard session, low reps" → suggests same or lower weight
- ✅ Output predictions are reasonable (not suggesting 5kg or 500kg)
