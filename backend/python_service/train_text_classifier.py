import os
import pickle
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, KFold
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import classification_report, accuracy_score

def main():
    print("Starting text classifier training...")

    #loading dataset
    data_path = os.path.join(os.path.dirname(__file__), "text_training_data.csv")
    if not os.path.exists(data_path):
        print(f"Error: Could not find data at {data_path}")
        return

    print(f"Loading data from: {data_path}")
    df = pd.read_csv(data_path)

    df = df.dropna(subset=['text', 'label'])
    
    print(f"Loaded {len(df)} examples for training.")

    X = df['text'].astype(str)
    y = df['label'].astype(str)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)
    print(f"Split data into {len(X_train)} training and {len(X_test)} testing examples.")

    print("\nStarting 5-Fold Cross-Validation on training data...")
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    fold_accuracies = []

    #iterating folds
    for fold, (train_idx, val_idx) in enumerate(kf.split(X_train), 1):
        #split fold data
        X_fold_train, X_fold_val = X_train.iloc[train_idx], X_train.iloc[val_idx]
        y_fold_train, y_fold_val = y_train.iloc[train_idx], y_train.iloc[val_idx]

        #vectorize fold data
        fold_vectorizer = TfidfVectorizer(max_df=0.85)
        X_fold_train_vec = fold_vectorizer.fit_transform(X_fold_train)
        X_fold_val_vec = fold_vectorizer.transform(X_fold_val)

        #fold model training
        fold_model = MultinomialNB(alpha=0.1)
        fold_model.fit(X_fold_train_vec, y_fold_train)

        #scoring fold
        fold_preds = fold_model.predict(X_fold_val_vec)
        acc = accuracy_score(y_fold_val, fold_preds)
        fold_accuracies.append(acc)
        print(f"Fold {fold}: Accuracy = {acc:.4f}")

    print(f"Mean CV Accuracy: {np.mean(fold_accuracies):.4f} (+/- {np.std(fold_accuracies):.4f})")
    print("Cross-Validation complete.\n")

    
    print("Vectorizing Text...")
    vectorizer = TfidfVectorizer(max_df=0.85)
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    #Training
    print("Training the final Naive Bayes model...")
    model = MultinomialNB(alpha=0.1)
    model.fit(X_train_vec, y_train)

    #evaluation
    print("Evaluating the model on the test data...")
    predictions = model.predict(X_test_vec)
    
    report = classification_report(y_test, predictions)
    print("\n--- Classification Report ---")
    print(report)
    print("-----------------------------\n")

    #saving model
    model_filename = os.path.join(os.path.dirname(__file__), "text_model.pkl")
    with open(model_filename, 'wb') as f:
        pickle.dump({'model': model, 'vectorizer': vectorizer}, f)

    print(f"Model saved successfully to {model_filename}")


if __name__ == "__main__":
    main()
