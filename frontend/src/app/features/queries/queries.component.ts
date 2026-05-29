import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-queries',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './queries.component.html',
  styleUrls: ['./queries.component.css']
})
export class QueriesComponent implements OnInit {
  queries: any[] = [];
  results: any[] = [];
  newQueryName: string = '';
  newProduct: string = '';
  newType: string = '';
  groups: any[] = [];
  selectedGroupId: string = '';
  showCreateForm: boolean = false;
  editingQueryId: string | null = null;
  executedQueryId: string | null = null;
  queryResults: any[] = [];
  queryStatistics: any = null;
  errorMessage: string = '';
  isAdmin: boolean = localStorage.getItem('role') === 'ADMIN';
  selectedQueryId: string | null = null;
  searchTerm: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  get filteredQueries() {
  const term = this.searchTerm.toLowerCase().trim();

  if (!term) {
    return this.queries;
  }

  return this.queries.filter(query =>
    (query.query_name || '').toLowerCase().includes(term) ||
    (query.group_name || '').toLowerCase().includes(term)
  );
}
  ngOnInit() {
    this.loadQueries();
    this.loadGroups();
  }

  getGroupName(groupId: string): string {
    const group = this.groups.find(g => g._id === groupId || g.id === groupId);
    return group ? group.name : '—';
  }

  goToCreateQuery(): void {
    this.router.navigate(['/queries/query-create']);
  }

  toggleActions(queryId: string) {
    this.selectedQueryId = this.selectedQueryId === queryId ? null : queryId;
  }

  openQuery(queryId: string) {
    this.router.navigate(['/queries', queryId]);
  }

  editQuery(query: any) {
    this.router.navigate(['/queries', query.id]);
    this.showCreateForm = true;
    this.editingQueryId = query.id;
    this.newQueryName = query.query_name;
    this.newProduct = query.filters?.product || '';
    this.newType = query.filters?.type || '';
    this.selectedGroupId = query.group_id;
  }

  deleteQuery(id: string) {
    this.http.delete(`/api/queries/${id}`).subscribe(() => {
      this.loadQueries();
    });
  }

  loadGroups() {
    this.http.get<any[]>('/api/groups/').subscribe({
      next: (data) => { this.groups = data; },
      error: () => { this.errorMessage = 'Erreur lors du chargement des groupes.'; }
    });
  }

  loadQueries() {
    this.http.get<any[]>('/api/queries/').subscribe({
      next: (data) => { this.queries = data; },
      error: () => { this.errorMessage = 'Erreur lors du chargement des requêtes.'; }
    });
  }

  executeQuery(queryId: string) {
    this.executedQueryId = queryId;
    this.http.get<any>(`/api/queries/${queryId}/execute`).subscribe({
      next: (res) => {
        this.queryResults = res.results || [];
        this.queryStatistics = {
          results_count: res.results_count,
          total_volume: res.total_volume,
          total_amount: res.total_amount,
          average_price: res.average_price
        };
      },
      error: () => { this.errorMessage = "Erreur lors de l'exécution de la requête."; }
    });
  }

  createQuery() {
    if (!this.selectedGroupId) {
      this.errorMessage = 'Choisis un groupe avant de créer la requête';
      return;
    }
    const body = {
      query_name: this.newQueryName,
      filters: { product: this.newProduct, type: this.newType },
      group_id: this.selectedGroupId
    };
    this.http.post('/api/queries/', body).subscribe({
      next: () => {
        this.showCreateForm = false;
        this.newQueryName = '';
        this.newProduct = '';
        this.newType = '';
        this.loadQueries();
      },
      error: () => { this.errorMessage = 'Erreur lors de la création de la requête.'; }
    });
  }
}
