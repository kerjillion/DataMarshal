import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export interface ConfirmDeleteData {
  primaryKeyValues: Record<string, any>;
  tableName: string;
}

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Confirm Delete</h2>
    <mat-dialog-content>
      <p>Are you sure you want to delete this record from <strong>{{ data.tableName }}</strong>?</p>
      
      <div class="key-values">
        <h4>Record to delete:</h4>
        @for (entry of keyEntries; track entry.key) {
          <div class="key-value-pair">
            <span class="key">{{ entry.key }}:</span>
            <span class="value">{{ entry.value }}</span>
          </div>
        }
      </div>
      
      <p class="warning">This action cannot be undone.</p>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button 
        mat-raised-button 
        color="warn" 
        data-testid="deleteRow"
        (click)="onConfirm()">
        Delete
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .key-values {
      margin: 16px 0;
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }
    
    .key-value-pair {
      display: flex;
      margin: 4px 0;
    }
    
    .key {
      font-weight: 500;
      margin-right: 8px;
      min-width: 100px;
    }
    
    .value {
      color: #666;
    }
    
    .warning {
      color: #d32f2f;
      font-weight: 500;
      margin-top: 16px;
    }
    
    mat-dialog-content {
      min-width: 300px;
    }
  `]
})
export class ConfirmDeleteDialogComponent {
  keyEntries: Array<{ key: string; value: any }>;

  constructor(
    public dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDeleteData
  ) {
    this.keyEntries = Object.entries(data.primaryKeyValues).map(([key, value]) => ({
      key,
      value: value?.toString() || 'null'
    }));
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
