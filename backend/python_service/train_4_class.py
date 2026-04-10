import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
import os
from tqdm import tqdm

# --- Configuration ---
DATA_DIR = 'data_4_class'  # Folder created by prepare_xview_data.py
MODEL_PATH = 'models/flood_model_4_class.pth'
NUM_CLASSES = 4
NUM_EPOCHS = 30  # Increased for Kaggle GPU training
BATCH_SIZE = 32 # Increased batch size for more stable training
LEARNING_RATE = 0.001

def train_model():
    """
    Handles data loading, model definition, and training for the 4-class model.
    """
    print("--- Initializing 4-Class Model Training ---")

    # 1. Define robust data transformations for aerial imagery
    data_transforms = {
        'train': transforms.Compose([
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(), # Added for aerial perspective
            transforms.RandomRotation(degrees=45), # Added for varied angles
            transforms.ColorJitter(brightness=0.2, contrast=0.2), # Added for lighting variations
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    # 2. Load datasets using ImageFolder
    print(f"Loading data from: {DATA_DIR}")
    try:
        image_datasets = {x: datasets.ImageFolder(os.path.join(DATA_DIR, x), data_transforms[x])
                          for x in ['train', 'val']}
        dataloaders = {x: DataLoader(image_datasets[x], batch_size=BATCH_SIZE, shuffle=True, num_workers=4)
                       for x in ['train', 'val']}
        dataset_sizes = {x: len(image_datasets[x]) for x in ['train', 'val']}
        class_names = image_datasets['train'].classes
    except FileNotFoundError:
        print(f"Error: Data directory '{DATA_DIR}' not found.")
        print("Please run 'python prepare_xview_data.py' first to create the dataset.")
        return
    except Exception as e:
        print(f"Error loading data: {e}")
        return

    if NUM_CLASSES != len(class_names):
        print(f"Error: Mismatch in class count! Model expects {NUM_CLASSES} but found {len(class_names)}.")
        return
        
    print(f"Classes found: {class_names}")

    # 3. Load a pre-trained EfficientNet-B0 model and adapt it
    model = models.efficientnet_b0(weights='IMAGENET1K_V1')
    num_ftrs = model.classifier[1].in_features
    # Change the final layer to output 4 classes
    model.classifier[1] = nn.Linear(num_ftrs, NUM_CLASSES)

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    print(f"Using device: {device}")

    # 4. Define loss function and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-4) # Switched to AdamW
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=NUM_EPOCHS) # Added LR Scheduler

    # --- Main Training Loop ---
    for epoch in range(NUM_EPOCHS):
        print(f'\nEpoch {epoch+1}/{NUM_EPOCHS}')
        print('-' * 10)

        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()
            else:
                model.eval()

            running_loss = 0.0
            running_corrects = 0

            for inputs, labels in tqdm(dataloaders[phase], desc=f"{phase} phase"):
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)

                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)

            epoch_loss = running_loss / dataset_sizes[phase]
            epoch_acc = running_corrects.double() / dataset_sizes[phase]

            print(f'{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}')

        # Step the scheduler at the end of every epoch (after val phase)
        scheduler.step()

    print("\n--- Training Finished ---")
    
    # 5. Save the trained model
    os.makedirs("models", exist_ok=True)
    torch.save(model.state_dict(), MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

if __name__ == '__main__':
    train_model()