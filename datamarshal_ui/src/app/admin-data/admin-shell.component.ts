import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { TableMetadata, DataGridFilter, FilterCriteria } from './types';
import { AdminDataService } from './admin-data.service';
import { FilterBarComponent } from './filter-bar.component';
import { DataGridComponent } from './data-grid.component';

interface SchemaGroup {
  schema: string;
  tables: TableMetadata[];
  expanded: boolean;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatBadgeModule,
    FilterBarComponent,
    DataGridComponent
  ],
  template: `
    <div class="admin-shell">
      <!-- Top Navigation -->
      <mat-toolbar color="primary" class="app-toolbar">
        <button 
          mat-icon-button
          (click)="toggleSidenav()"
          aria-label="Toggle navigation">
          <mat-icon>menu</mat-icon>
        </button>
        
        <span class="app-title">DataMarshal Admin</span>
        
        <span class="spacer"></span>
        
        @if (currentTable()) {
          <span class="current-table">{{ getCurrentTableDisplay() }}</span>
        }
        
        <button 
          mat-icon-button
          (click)="refreshMetadata()"
          [disabled]="metadataLoading()"
          matTooltip="Refresh table list">
          <mat-icon>refresh</mat-icon>
        </button>
      </mat-toolbar>

      <!-- Main Content Area -->
      <mat-sidenav-container class="content-container">
        <!-- Side Navigation -->
        <mat-sidenav 
          #sidenav 
          mode="side" 
          opened="true"
          class="sidenav">
          
          <div class="sidenav-content">
            <div class="sidenav-header">
              <h3>Database Tables</h3>
              @if (metadataLoading()) {
                <mat-spinner diameter="20"></mat-spinner>
              }
            </div>

            @if (metadataLoading()) {
              <div class="loading-state">
                <p>Loading tables...</p>
              </div>
            } @else if (schemaGroups().length === 0) {
              <div class="empty-state">
                <mat-icon>database</mat-icon>
                <p>No tables found</p>
                <button mat-button (click)="refreshMetadata()">
                  Try Again
                </button>
              </div>
            } @else {
              <!-- Schema Groups -->
              <mat-accordion class="schema-accordion">
                @for (group of schemaGroups(); track group.schema) {
                  <mat-expansion-panel [expanded]="group.expanded">
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        <mat-icon>folder</mat-icon>
                        {{ group.schema }}
                        <span class="table-count" [matBadge]="group.tables.length"></span>
                      </mat-panel-title>
                    </mat-expansion-panel-header>
                    
                    <mat-nav-list>
                      @for (table of group.tables; track table.id.table) {
                        <mat-list-item 
                          [class.selected]="isTableSelected(table)"
                          (click)="selectTable(table)">
                          <mat-icon matListItemIcon>table_chart</mat-icon>
                          <span matListItemTitle>{{ table.id.table }}</span>
                        </mat-list-item>
                      }
                    </mat-nav-list>
                  </mat-expansion-panel>
                }
              </mat-accordion>
            }
          </div>
        </mat-sidenav>

        <!-- Main Content -->
        <mat-sidenav-content class="main-content">
          @if (!currentTable()) {
            <!-- Welcome State -->
            <div class="welcome-state">
              <mat-icon>storage</mat-icon>
              <h2>Welcome to DataMarshal Admin</h2>
              <p>Select a table from the navigation to start editing data</p>
              
              @if (schemaGroups().length === 0 && !metadataLoading()) {
                <div class="get-started">
                  <p>No database tables found. Make sure your database connection is configured.</p>
                  <button mat-raised-button color="primary" (click)="refreshMetadata()">
                    Load Tables
                  </button>
                </div>
              }
            </div>
          } @else {
            <!-- Table Management -->
            <div class="table-management">
              <!-- Filter Bar -->
              <app-filter-bar
                [meta]="currentTable()!"
                (filterChange)="onFilterChange($event)">
              </app-filter-bar>

              <!-- Data Grid -->
              <app-data-grid
                [meta]="currentTable()!"
                [schemaTable]="getCurrentSchemaTable()"
                [filters]="currentFilters()"
                (filtersChange)="onFiltersChange($event)"
                (dataChanged)="onDataChanged()">
              </app-data-grid>
            </div>
          }
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .admin-shell {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .app-toolbar {
      z-index: 1000;
    }

    .app-title {
      font-size: 20px;
      font-weight: 500;
    }

    .spacer {
      flex: 1;
    }

    .current-table {
      font-size: 14px;
      opacity: 0.8;
      margin-right: 16px;
    }

    .content-container {
      flex: 1;
      height: calc(100vh - 64px);
    }

    .sidenav {
      width: 300px;
      border-right: 1px solid #e0e0e0;
    }

    .sidenav-content {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .sidenav-header {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sidenav-header h3 {
      margin: 0;
      color: #333;
      font-size: 16px;
      font-weight: 500;
    }

    .loading-state {
      padding: 16px;
      text-align: center;
      color: #666;
    }

    .empty-state {
      padding: 40px 16px;
      text-align: center;
      color: #666;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .schema-accordion {
      flex: 1;
      overflow-y: auto;
    }

    .schema-accordion .mat-expansion-panel {
      box-shadow: none;
      border-bottom: 1px solid #e0e0e0;
    }

    .schema-accordion .mat-expansion-panel-header {
      padding: 0 16px;
      height: 48px;
    }

    .schema-accordion .mat-panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .table-count {
      margin-left: auto;
    }

    .schema-accordion mat-nav-list {
      padding: 0;
    }

    .schema-accordion mat-list-item {
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .schema-accordion mat-list-item:hover {
      background-color: #f5f5f5;
    }

    .schema-accordion mat-list-item.selected {
      background-color: #e3f2fd;
      border-left: 4px solid #2196f3;
    }

    .row-count {
      font-size: 12px;
      color: #666;
    }

    .main-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .welcome-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 40px;
      text-align: center;
      color: #666;
    }

    .welcome-state mat-icon {
      font-size: 72px;
      width: 72px;
      height: 72px;
      color: #ccc;
      margin-bottom: 24px;
    }

    .welcome-state h2 {
      margin: 0 0 16px 0;
      color: #333;
    }

    .get-started {
      margin-top: 24px;
      padding: 24px;
      background: #f5f5f5;
      border-radius: 8px;
      max-width: 400px;
    }

    .table-management {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .table-management app-filter-bar {
      flex-shrink: 0;
    }

    .table-management app-data-grid {
      flex: 1;
      overflow: hidden;
    }

    @media (max-width: 768px) {
      .sidenav {
        width: 280px;
      }
      
      .current-table {
        display: none;
      }
    }
  `]
})
export class AdminShellComponent implements OnInit, OnDestroy {
  metadataLoading = signal(false);
  allTables = signal<TableMetadata[]>([]);
  currentTable = signal<TableMetadata | null>(null);
  currentFilters = signal<DataGridFilter[]>([]);
  sidenavOpen = signal(true);

  schemaGroups = computed(() => {
    const tables = this.allTables();
    const groups = new Map<string, TableMetadata[]>();

    tables.forEach(table => {
      const schema = table.id.schema;
      if (!groups.has(schema)) {
        groups.set(schema, []);
      }
      groups.get(schema)!.push(table);
    });

    // Convert to array and sort
    const result: SchemaGroup[] = Array.from(groups.entries())
      .map(([schema, schemaTables]) => ({
        schema,
        tables: schemaTables.sort((a, b) => a.id.table.localeCompare(b.id.table)),
        expanded: true // Expand all schemas by default
      }))
      .sort((a, b) => a.schema.localeCompare(b.schema));

    return result;
  });

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: AdminDataService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadMetadata();
    
    // Watch for route changes
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const schema = params.get('schema');
        const table = params.get('table');
        
        if (schema && table) {
          this.selectTableByName(schema, table);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadMetadata(): Promise<void> {
    this.metadataLoading.set(true);

    try {
      const tables = await this.dataService.getAllTableMetadata().toPromise();
      if (tables) {
        this.allTables.set(tables);
      }

      // If we have a current route, try to select that table
      const schema = this.route.snapshot.paramMap.get('schema');
      const table = this.route.snapshot.paramMap.get('table');
      
      if (schema && table) {
        this.selectTableByName(schema, table);
      }

    } catch (error: any) {
      this.snackBar.open(
        error.error?.message || 'Failed to load database metadata',
        'Close',
        { duration: 5000 }
      );
    } finally {
      this.metadataLoading.set(false);
    }
  }

  refreshMetadata(): void {
    this.loadMetadata();
  }

  selectTable(table: TableMetadata): void {
    this.currentTable.set(table);
    this.currentFilters.set([]);
    
    // Update URL
    this.router.navigate(['/admin', table.id.schema, table.id.table]);
  }

  selectTableByName(schema: string, table: string): void {
    const foundTable = this.allTables().find(t => 
      t.id.schema === schema && t.id.table === table
    );
    
    if (foundTable) {
      this.currentTable.set(foundTable);
      this.currentFilters.set([]);
    }
  }

  isTableSelected(table: TableMetadata): boolean {
    const current = this.currentTable();
    return current?.id.schema === table.id.schema && 
           current?.id.table === table.id.table;
  }

  getCurrentTableDisplay(): string {
    const table = this.currentTable();
    return table ? `${table.id.schema}.${table.id.table}` : '';
  }

  getCurrentSchemaTable(): string {
    const table = this.currentTable();
    return table ? `${table.id.schema}.${table.id.table}` : '';
  }

  toggleSidenav(): void {
    this.sidenavOpen.set(!this.sidenavOpen());
  }

  onFilterChange(criteria: FilterCriteria): void {
    // Convert FilterCriteria to DataGridFilter[]
    const filters: DataGridFilter[] = Object.entries(criteria).map(([column, value]) => {
      if (typeof value === 'string') {
        return { column, operator: 'equals' as const, value };
      } else if (value && typeof value === 'object' && 'op' in value) {
        const operator = value.op === 'like' ? 'contains' as const : 'equals' as const;
        return { column, operator, value: value.value };
      }
      return { column, operator: 'equals' as const, value: '' };
    });
    
    this.currentFilters.set(filters);
  }

  onFiltersChange(filters: DataGridFilter[]): void {
    this.currentFilters.set(filters);
  }

  onDataChanged(): void {
    // Could refresh metadata to update row counts
    // For now, just emit event for potential future use
  }
}
