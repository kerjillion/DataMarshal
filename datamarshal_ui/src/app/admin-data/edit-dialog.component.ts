import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EditDialogData, ConflictError } from './types';
import { AdminDataService } from './admin-data.service';
import { 
  getEditableColumns, 
  diffChanges, 
  getPrimaryKeyValues, 
  getRowVersion,
  sqlTypeToInput,
  isNumericType,
  isDateType,
  isLongText
} from './utils';

@Component({
  selector: 'app-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ isEditMode() ? 'Edit' : 'Add' }} {{ data.meta.id.table }} Record
    </h2>

    <form [formGroup]="editForm" (ngSubmit)="onSave()">
      <mat-dialog-content class="dialog-content">
        @if (loading()) {
          <div class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Saving changes...</p>
          </div>
        } @else {
          <div class="form-fields">
            @for (column of editableColumns; track column.ColumnName) {
              <div class="field-container">
                @if (getInputType(column) === 'checkbox') {
                  <mat-checkbox [formControlName]="column.ColumnName">
                    {{ column.ColumnName }}
                  </mat-checkbox>
                } @else if (getInputType(column) === 'date') {
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{ column.ColumnName }}</mat-label>
                    <input 
                      matInput 
                      [matDatepicker]="picker"
                      [formControlName]="column.ColumnName"
                      readonly />
                    <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                    <mat-datepicker #picker></mat-datepicker>
                    @if (getFieldError(column.ColumnName)) {
                      <mat-error>{{ getFieldError(column.ColumnName) }}</mat-error>
                    }
                  </mat-form-field>
                } @else if (getInputType(column) === 'select') {
                  <!-- TODO: Implement foreign key select when lookup endpoint is available -->
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{ column.ColumnName }}</mat-label>
                    <mat-select [formControlName]="column.ColumnName">
                      <mat-option value="">None</mat-option>
                      <!-- Options will be populated from lookup service -->
                    </mat-select>
                    @if (getFieldError(column.ColumnName)) {
                      <mat-error>{{ getFieldError(column.ColumnName) }}</mat-error>
                    }
                  </mat-form-field>
                } @else if (isLongText(column)) {
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{ column.ColumnName }}</mat-label>
                    <textarea 
                      matInput 
                      [formControlName]="column.ColumnName"
                      rows="4"
                      [placeholder]="getPlaceholder(column)">
                    </textarea>
                    @if (getFieldError(column.ColumnName)) {
                      <mat-error>{{ getFieldError(column.ColumnName) }}</mat-error>
                    }
                  </mat-form-field>
                } @else {
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{ column.ColumnName }}</mat-label>
                    <input 
                      matInput 
                      [type]="getInputType(column)"
                      [formControlName]="column.ColumnName"
                      [placeholder]="getPlaceholder(column)" />
                    @if (getFieldError(column.ColumnName)) {
                      <mat-error>{{ getFieldError(column.ColumnName) }}</mat-error>
                    }
                  </mat-form-field>
                }
              </div>
            }
          </div>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button 
          mat-button 
          type="button" 
          (click)="onCancel()"
          [disabled]="loading()">
          Cancel
        </button>
        <button 
          mat-raised-button 
          color="primary" 
          type="submit"
          data-testid="saveRow"
          [disabled]="!editForm.valid || loading()">
          {{ isEditMode() ? 'Save Changes' : 'Create' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .dialog-content {
      min-width: 500px;
      max-width: 800px;
      max-height: 600px;
      padding: 20px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
    }

    .loading-container p {
      margin-top: 16px;
      color: #666;
    }

    .form-fields {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .field-container {
      width: 100%;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-actions {
      padding: 16px 20px;
    }
  `]
})
export class EditDialogComponent implements OnInit {
  editForm: FormGroup;
  editableColumns: any[] = [];
  loading = signal(false);
  originalRow: any = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditDialogComponent>,
    private dataService: AdminDataService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: EditDialogData
  ) {
    this.editableColumns = getEditableColumns(this.data.meta);
    this.editForm = this.buildForm();
    this.originalRow = this.data.row ? { ...this.data.row } : null;
  }

  ngOnInit(): void {
    if (this.data.row) {
      this.populateForm(this.data.row);
    }
  }

  isEditMode(): boolean {
    return !!this.data.row;
  }

  private buildForm(): FormGroup {
    const formControls: any = {};

    for (const column of this.editableColumns) {
      const validators = [];

      // Required validation
      if (!column.IsNullable) {
        validators.push(Validators.required);
      }

      // Max length validation
      if (column.MaxLength > 0 && !isNumericType(column.SqlType)) {
        validators.push(Validators.maxLength(column.MaxLength));
      }

      // Numeric pattern validation
      if (isNumericType(column.SqlType)) {
        validators.push(Validators.pattern(/^-?\d*\.?\d+$/));
      }

      // Default value
      let defaultValue = null;
      if (column.DefaultExpr && !this.isEditMode()) {
        // Parse simple default expressions
        if (column.DefaultExpr.includes('getdate()') || column.DefaultExpr.includes('GETDATE()')) {
          defaultValue = new Date();
        } else if (column.DefaultExpr.match(/^\d+$/)) {
          defaultValue = parseInt(column.DefaultExpr);
        } else if (column.DefaultExpr.match(/^'.*'$/)) {
          defaultValue = column.DefaultExpr.slice(1, -1); // Remove quotes
        }
      }

      formControls[column.ColumnName] = [defaultValue, validators];
    }

    return this.fb.group(formControls);
  }

  private populateForm(row: any): void {
    const formValue: any = {};
    
    for (const column of this.editableColumns) {
      let value = row[column.ColumnName];
      
      // Handle date conversion
      if (value && isDateType(column.SqlType)) {
        value = new Date(value);
      }
      
      formValue[column.ColumnName] = value;
    }

    this.editForm.patchValue(formValue);
  }

  getInputType(column: any): string {
    if (column.SqlType.toLowerCase() === 'bit') {
      return 'checkbox';
    }
    
    // TODO: Check for foreign key relationships and return 'select'
    // This would require checking the meta for foreign key information
    
    return sqlTypeToInput(column.SqlType);
  }

  getPlaceholder(column: any): string {
    if (!column.IsNullable) {
      return 'Required';
    }
    if (column.MaxLength > 0) {
      return `Max ${column.MaxLength} characters`;
    }
    return 'Optional';
  }

  getFieldError(fieldName: string): string | null {
    const field = this.editForm.get(fieldName);
    if (field && field.invalid && field.touched) {
      if (field.errors?.['required']) {
        return 'This field is required';
      }
      if (field.errors?.['maxlength']) {
        const maxLength = field.errors['maxlength'].requiredLength;
        return `Maximum ${maxLength} characters allowed`;
      }
      if (field.errors?.['pattern']) {
        return 'Invalid format';
      }
    }
    return null;
  }

  async onSave(): Promise<void> {
    if (!this.editForm.valid || this.loading()) {
      return;
    }

    this.loading.set(true);

    try {
      const formValue = this.editForm.value;

      if (this.isEditMode()) {
        // Update existing record
        const primaryKey = getPrimaryKeyValues(this.originalRow, this.data.meta.primaryKey);
        const originalRowVersion = getRowVersion(this.originalRow, this.data.meta.columns);
        
        const editableColumnNames = new Set(this.editableColumns.map(col => col.ColumnName));
        const changes = diffChanges(this.originalRow, formValue, editableColumnNames);

        if (Object.keys(changes).length === 0) {
          this.snackBar.open('No changes detected', 'Close', { duration: 3000 });
          this.dialogRef.close(false);
          return;
        }

        await this.dataService.update(
          this.data.schemaTable,
          primaryKey,
          changes,
          originalRowVersion
        ).toPromise();

        this.snackBar.open('Record updated successfully', 'Close', { duration: 3000 });
      } else {
        // Insert new record
        await this.dataService.insert(this.data.schemaTable, formValue).toPromise();
        this.snackBar.open('Record created successfully', 'Close', { duration: 3000 });
      }

      this.dialogRef.close(true);
    } catch (error: any) {
      this.loading.set(false);
      
      if (error.kind === 'conflict') {
        // Handle concurrency conflict
        const result = await this.snackBar.open(
          'This record was modified by another user. Reload with latest data?',
          'Reload',
          { duration: 10000 }
        ).onAction().toPromise();

        if (result) {
          await this.handleConflictReload();
        }
      } else {
        this.snackBar.open(
          error.error?.message || 'An error occurred while saving',
          'Close',
          { duration: 5000 }
        );
      }
    }
  }

  private async handleConflictReload(): Promise<void> {
    try {
      // In a real implementation, you would refetch the specific row
      // For now, we'll close and let the parent component refresh
      this.snackBar.open('Please refresh the grid and try again', 'Close', { duration: 5000 });
      this.dialogRef.close(false);
    } catch (error) {
      this.snackBar.open('Failed to reload record', 'Close', { duration: 3000 });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  // Expose utility function to template
  isLongText = isLongText;
}
