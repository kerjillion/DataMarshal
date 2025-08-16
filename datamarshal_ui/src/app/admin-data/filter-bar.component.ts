import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TableMeta, FilterCriteria } from './types';
import { getDisplayableColumns } from './utils';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="filter-bar">
      <form [formGroup]="filterForm" class="filter-form">
        <mat-form-field appearance="outline" class="column-field">
          <mat-label>Column</mat-label>
          <mat-select formControlName="column" placeholder="Select column to filter">
            @for (col of filterableColumns; track col.ColumnName) {
              <mat-option [value]="col.ColumnName">{{ col.ColumnName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="operator-field">
          <mat-label>Operator</mat-label>
          <mat-select formControlName="operator">
            <mat-option value="equals">Equals</mat-option>
            <mat-option value="like">Contains</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="value-field">
          <mat-label>Value</mat-label>
          <input matInput formControlName="value" placeholder="Enter filter value" />
        </mat-form-field>

        <div class="filter-actions">
          <button 
            mat-raised-button 
            color="primary" 
            type="button"
            [disabled]="!isFilterValid()"
            (click)="applyFilter()">
            <mat-icon>filter_list</mat-icon>
            Apply
          </button>
          
          <button 
            mat-button 
            type="button"
            [disabled]="!hasActiveFilters()"
            (click)="clearFilters()">
            <mat-icon>clear</mat-icon>
            Clear
          </button>
        </div>
      </form>

      @if (hasActiveFilters()) {
        <div class="active-filters">
          <span class="filter-label">Active filters:</span>
          @for (filter of activeFiltersArray(); track filter.column) {
            <div class="filter-chip">
              <span class="filter-text">
                {{ filter.column }} {{ filter.operator === 'like' ? 'contains' : 'equals' }} "{{ filter.value }}"
              </span>
              <button 
                mat-icon-button 
                (click)="removeFilter(filter.column)"
                class="remove-filter">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .filter-bar {
      padding: 16px;
      background: #f5f5f5;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .filter-form {
      display: flex;
      gap: 16px;
      align-items: end;
      flex-wrap: wrap;
    }

    .column-field,
    .operator-field {
      min-width: 150px;
    }

    .value-field {
      min-width: 200px;
      flex: 1;
    }

    .filter-actions {
      display: flex;
      gap: 8px;
    }

    .active-filters {
      margin-top: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }

    .filter-label {
      font-weight: 500;
      color: #666;
      margin-right: 8px;
    }

    .filter-chip {
      display: flex;
      align-items: center;
      background: #e3f2fd;
      border: 1px solid #2196f3;
      border-radius: 16px;
      padding: 4px 8px 4px 12px;
      font-size: 12px;
    }

    .filter-text {
      margin-right: 4px;
    }

    .remove-filter {
      width: 20px;
      height: 20px;
      line-height: 20px;
    }

    .remove-filter mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
  `]
})
export class FilterBarComponent {
  @Input() meta: TableMeta | null = null;
  @Output() filterChange = new EventEmitter<FilterCriteria>();

  filterForm: FormGroup;
  private currentFilters = signal<FilterCriteria>({});

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      column: [''],
      operator: ['equals'],
      value: ['']
    });
  }

  get filterableColumns() {
    if (!this.meta) return [];
    
    // Get displayable columns and filter to a reasonable subset for filtering
    return getDisplayableColumns(this.meta)
      .filter(col => 
        !col.IsIdentity && 
        !col.IsComputed &&
        ['varchar', 'nvarchar', 'char', 'nchar', 'text', 'ntext', 'int', 'bigint', 'smallint'].some(type =>
          col.SqlType.toLowerCase().includes(type.toLowerCase())
        )
      )
      .slice(0, 10); // Limit to first 10 filterable columns
  }

  isFilterValid(): boolean {
    const form = this.filterForm.value;
    return !!(form.column && form.value?.trim());
  }

  hasActiveFilters(): boolean {
    return Object.keys(this.currentFilters()).length > 0;
  }

  activeFiltersArray() {
    const filters = this.currentFilters();
    return Object.entries(filters).map(([column, criteria]) => {
      if (typeof criteria === 'string') {
        return { column, operator: 'equals', value: criteria };
      } else {
        return { column, operator: criteria.op, value: criteria.value };
      }
    });
  }

  applyFilter(): void {
    if (!this.isFilterValid()) return;

    const form = this.filterForm.value;
    const filters = { ...this.currentFilters() };
    
    if (form.operator === 'equals') {
      filters[form.column] = form.value.trim();
    } else {
      filters[form.column] = {
        op: 'like' as const,
        value: form.value.trim()
      };
    }

    this.currentFilters.set(filters);
    this.filterChange.emit(filters);

    // Reset form but keep column and operator
    this.filterForm.patchValue({ value: '' });
  }

  removeFilter(column: string): void {
    const filters = { ...this.currentFilters() };
    delete filters[column];
    this.currentFilters.set(filters);
    this.filterChange.emit(filters);
  }

  clearFilters(): void {
    this.currentFilters.set({});
    this.filterChange.emit({});
    this.filterForm.reset({ operator: 'equals' });
  }
}
