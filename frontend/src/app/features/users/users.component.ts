import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
@Component({
  standalone: true,
   imports: [CommonModule],
  template: `
    <h1>Users</h1>

   <ul>
      <li *ngFor="let user of users">
        {{ user.email }}

        
        <button (click)="viewUser(user)">Consulter</button>
        <button (click)="editUser(user)">Modifier</button>
        <button (click)="deleteUser(user.id)">Supprimer</button>
      </li>
    </ul>

    <hr>
 <button (click)="createUser()">Créer un utilisateur</button>
    <button (click)="logout()">Logout</button>
  `
})
export class UsersComponent implements OnInit {

  users: any[] = [];
viewUser(user: any) {
    this.router.navigate(['/users', user.id]);;
}

editUser(user: any) {
   this.router.navigate(['/users/edit', user.id]);
}

deleteUser(id: number) {
  const token = localStorage.getItem('token');

  this.http.delete(`http://localhost:8000/users/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).subscribe(() => {
    //refresh liste
    this.users = this.users.filter(u => u.id !== id);
  });
}

createUser() {
   this.router.navigate(['/users/create']);
}
  constructor(private http: HttpClient,
     private router: Router
  ) {}

  ngOnInit() {
    const token = localStorage.getItem('token');

    this.http.get('http://localhost:8000/users', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe((res: any) => {
      this.users = res;
    });
  }
   logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/']);
  }
}

