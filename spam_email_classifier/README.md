## **Exercise 1: Spam Email Classifier**

### **The Problem**
You're building a spam filter. You have historical email data where someone already labeled emails as "spam" or "not spam". You need to train a neural network to **predict** whether a new email is spam or legitimate.

### **Your Dataset**

You'll work with emails that have these **4 features**:

1. **Word Count** — How many words in the email (normalize to 0-1. Assume emails range from 5 to 500 words)
2. **Has Multiple Exclamation Marks** — Does it have 3+ exclamation marks? (1 = yes, 0 = no)
3. **Has Suspicious Links** — Does it contain "click here", "verify account", "confirm password"? (1 = yes, 0 = no)
4. **Time Since Account Creation** — How old is the sender's account in months? (normalize to 0-1. Assume accounts range from 0 to 60 months)

### **Training Data (You Create This)**

You need to create **at least 5-6 examples** of emails you manually label as spam or legitimate. For example:

```
Email 1: 
  - 50 words
  - No exclamation marks
  - No suspicious links
  - Sender account is 24 months old
  - Label: LEGITIMATE

Email 2:
  - 30 words
  - Has 5 exclamation marks
  - Has "click here" and "verify account"
  - Sender account is 2 days old
  - Label: SPAM

... etc
```

### **Your Goals**

**Phase 1: Data Preparation**
- [X] Create 6-10 realistic email examples with the 4 features above
- [X] Normalize numeric values (word count, account age) to 0-1 range
- [X] One-hot encode your labels: `[1, 0]` = legitimate, `[0, 1]` = spam
- [X] Create two tensors: one for inputs (features), one for outputs (labels)
- [X] Print them to verify they look correct

**Phase 2: Build the Network**
- [X] Create a sequential neural network with:
  - Input layer: 4 neurons (for your 4 features)
  - Hidden layer: 8 neurons with ReLU activation
    - Q: Is the hidden layer defined together with the input shape?
    - A: Sort of, in this case yes.
    - Q: When the input shape is set as 4, it means that it has 4 neurons?
    - A: No it just means that there is 4 inputs, kind of parameters to a function.
  - Output layer: 2 neurons with softmax activation (for binary classification)
- [X] Compile it with appropriate loss function and optimizer
  - *Hint: Think about what loss function makes sense for classification*

**Phase 3: Train**
- [X] Train the network on your data for 100+ epochs
- [X] Monitor the loss — it should decrease over time
- [X] Print the loss at intervals to see improvement

**Phase 4: Predict**
- [X] Create a "new email" that the network has never seen
- [X] Feed it to your trained model
- [X] Get predictions and print the results
- [X] Verify: Does it make sense? (Is the spam email predicted as spam?)

---

### **Key Concepts to Research/Understand**

Before you start coding, make sure you understand:

1. **Normalization** — Why do we scale numbers to 0-1?
- It's more effetive for the neural network
- Reduces computer power to train it?
2. **One-hot encoding** — Why do we represent categories as [1,0] instead of 0 or 1?
- Eliminates oridnality, meaning that when being processed the algorithim will not infer any mathematical relationship, rank or hierarchy between categories.
- Improves model performance
- Is more compatibile with ML algorithms
- Might become a problem when dealing with a lot of different categories
3. **Activation functions** — What's ReLU? What's Softmax?
- ReLu: is a popular activation function that ignores negative values and output the input directly if positive, it seems to be very computer efficient as well
Q: Does it mean that for every value 0 a neuron in the network is not activated?
A: No, it only means that the value doesn't pass forward.
- Softmax: is usally used for outputs and converts the output value into probabilities that sum 1
4. **Loss functions** — Why use `categoricalCrossentropy` vs `meanSquaredError`?
- I don't have enough background to answer this one.
- meanSquaredError: Seems to be used for regression (which I have no idea what it is)
  - A: Regression is used to predict continuous numbers (house prices, temperature, weight on my next gym exercise)
- categoricalCrossentropy: Seems to be used for classification (which I also have no idea what it is) and used it because of the hint.
  - A: Classification is used to predict specific categories
5. **Epochs** — What does it mean to train for 100 epochs?
- The more Epochs we have, the more the model will iterate over the training data meaning it tends to become more accurate when we add more epochs.

---

### **Success Criteria**

You'll know you got it right when:
- ✅ Your model trains without errors
- ✅ Loss decreases as epochs increase
- ✅ When you feed it a clear spam email (many exclamation marks, suspicious links, new account), it predicts high spam probability
- ✅ When you feed it a clear legitimate email (normal words, no links, old account), it predicts high legitimate probability
