import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {FormsModule} from "@angular/forms";
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-query-execution',
  standalone: true,
 imports: [CommonModule, FormsModule],
  templateUrl: './query-execution.component.html',
  styleUrls: ['./query-execution.component.css']
})
export class QueryExecutionComponent  implements OnInit {
queryId: string ='';
query: any = null;
results: any[] = [];
newQueryName: string = '';
newProduct: string = '';
newType: string = '';
groups: any[] = [];
selectedGroupId: string = '';
showCreateForm: boolean = false;
constructor(
  private http: HttpClient,
  private router: Router,
  private route: ActivatedRoute) {}


  ngOnInit() {
    this.queryId = this.route.snapshot.paramMap.get('id') || '';
    this.loadGroups();
    this.loadQuery();
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



deleteQuery(id: string) {
  this.http.delete(`http://127.0.0.1:8000/queries/${id}`, this.getHeaders())
    .subscribe(() => {
      this.router.navigate(['/queries']);
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
   loadQuery() {
    this.http.get<any>(`http://127.0.0.1:8000/queries/${this.queryId}`, this.getHeaders())
      .subscribe(data => {
        this.query = data;
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
  startEdit() {
  this.showCreateForm = true;

  this.newQueryName = this.query.query_name;
  this.newProduct = this.query.filters?.product || '';
  this.newType = this.query.filters?.type || '';
  this.selectedGroupId = this.query.group_id;


}
updateQuery() {
  const body = {
    query_name: this.newQueryName,
    filters: {
      product: this.newProduct,
      type: this.newType
    },
    group_id: this.selectedGroupId
  };

  this.http.put(
    `http://127.0.0.1:8000/queries/${this.queryId}`,
    body,
    this.getHeaders()
  ).subscribe({
    next: () => {
      this.showCreateForm = false;
      this.loadQuery();
    },
    error: (err) => console.error('Erreur modification query', err)
  });
}
}
