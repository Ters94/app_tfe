import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-queries',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadQueries();
    this.loadGroups();
  }

   getHeaders() {
    const token = localStorage.getItem('token');
    console.log('TOKEN:', localStorage.getItem('token'));
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }
  getGroupName(groupId: string): string {
  const group = this.groups.find(g => g._id === groupId || g.id === groupId);
  return group ? group.name : '—';
}
editQuery(query: any) {
  this.showCreateForm = true;

  this.editingQueryId = query.id;

  this.newQueryName = query.query_name;
  this.newProduct = query.filters?.product || '';
  this.newType = query.filters?.type || '';
  this.selectedGroupId = query.group_id;
}

  deleteQuery(id: string) {
  this.http.delete(`http://127.0.0.1:8000/queries/${id}`, this.getHeaders())
    .subscribe(() => {
      this.loadQueries();
    });
}
  loadGroups() {
    this.http.get<any[]>('http://127.0.0.1:8000/groups/', this.getHeaders())
      .subscribe({
        next: (data) => {
          this.groups = data;
        },
        error: (err) => {
          console.error('Erreur chargement groups', err);
        }
      });
  }

  loadQueries() {
    this.http.get<any[]>('http://127.0.0.1:8000/queries/', this.getHeaders())
      .subscribe({
        next: (data) => {
          this.queries = data;
        },
        error: (err) => {
          console.error('Erreur chargement queries', err);
        }
      });
  }
  executeQuery(queryId: string) {
    this.http.get<any>(`http://127.0.0.1:8000/queries/${queryId}/execute`, this.getHeaders())
      .subscribe({
        next: (res) => {
          this.results = res.results;
        },
        error: (err) => {
          console.error('Erreur exécution query', err);
        }
      });
  }
  createQuery() {
  const groupId = localStorage.getItem('group_id'); // ou à adapter

  if (!this.selectedGroupId) {
  alert('Choisis un groupe avant de créer la query');
  return;
}
  const body = {
    query_name: this.newQueryName,
    filters: {
      product: this.newProduct,
      type: this.newType
    },
    group_id: this.selectedGroupId
  };

  this.http.post('http://127.0.0.1:8000/queries/', body, this.getHeaders())
    .subscribe({
      next: () => {
        this.showCreateForm = false;
        this.newQueryName = '';
        this.newProduct = '';
        this.newType = '';
        this.loadQueries();
      },
      error: (err) => {
        console.error('Erreur création query', err.error.detail);
      }
    });
}
}
