import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-query-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './query-create.component.html',
  styleUrls: ['./query-create.component.css']
})
export class QueryCreateComponent implements OnInit {

  newQueryName: string = '';
  newProduct: string = '';
  newType: string = '';
  showCreateForm: boolean = true;

  groupId: string = '';
  group: any = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.groupId = this.route.snapshot.queryParamMap.get('groupId') || '';
    this.loadGroup();
  }

  getHeaders() {
    const token = localStorage.getItem('token');

    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }

  loadGroup() {
    this.http.get<any>(
      `http://127.0.0.1:8000/groups/${this.groupId}`,
      this.getHeaders()
    ).subscribe({
      next: (data) => {
        this.group = data;
      },
      error: (err) => {
        console.error('Erreur chargement group', err);
      }
    });
  }

  createQuery() {
    const body = {
      query_name: this.newQueryName,
      filters: {
        product: this.newProduct,
        type: this.newType
      },
      group_id: this.groupId
    };

    this.http.post(
      'http://127.0.0.1:8000/queries/',
      body,
      this.getHeaders()
    ).subscribe({
      next: () => {
        this.router.navigate(['/groups', this.groupId]);
      },
      error: (err) => {
        console.error('Erreur création query', err);
      }
    });
  }
  goBack(): void {
    this.router.navigate(['/groups',this.groupId]);
  }
  logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  localStorage.removeItem('user_id');
  this.router.navigate(['/']);
}
}
