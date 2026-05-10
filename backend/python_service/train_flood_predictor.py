import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os


def train_model():
    print("Starting Flood Prediction Model Training...")
    
    
    dataset_path = "flood_dataset.csv"
    if not os.path.exists(dataset_path):
        print(f"Error: Could not find {dataset_path} in the current directory.")
        return

    #loading dataset
    print(f"Loading data from {dataset_path}...")
    df = pd.read_csv(dataset_path)
    

    columns_to_drop = [
        'Disaster Type', 'Total Deaths', 'Total Affected', 
        'duration', 'time', 'distance' 
    ]
    
    
    actual_columns_to_drop = [c for c in columns_to_drop if c in df.columns]
    df_clean = df.drop(columns=actual_columns_to_drop)
    
    df_clean.fillna(df_clean.median(), inplace=True)
    

    if 'occured' not in df_clean.columns:
        print("Error: 'occured' column not found in dataset. Cannot set target variable.")
        return
        
    y = df_clean['occured']
    X = df_clean.drop(columns=['occured'])
    
    print("\nTraining on the following features:")
    for col in X.columns:
        print(f" - {col}")
        
    #splitting dataset
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"\nTraining Random Forest model on {len(X_train)} rows...")
    #training the Random Forest Classifier
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    rf_model.fit(X_train, y_train)
    
    # Evaluating the model
    print("Evaluating model...")
    y_pred = rf_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\nModel Training Complete!")
    print(f"Model Accuracy on Test Set: {accuracy * 100:.2f}%\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred))
    
    #Saving model
    model_filename = "flood_model.pkl"
    joblib.dump(rf_model, model_filename)
    
    feature_names_filename = "model_features.pkl"
    joblib.dump(list(X.columns), feature_names_filename)
    
    print(f"Model saved successfully as '{model_filename}'")
    print(f"Expected features saved as '{feature_names_filename}'")
    print("\nThe Python FastAPI service is now ready to be updated to use this model!")

if __name__ == "__main__":
    train_model()
