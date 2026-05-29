import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  role: string = '';
  username: string = '';
  user_id: string = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');
    const user_id = localStorage.getItem('user_id') || '';
    if (!token) {
      alert('Session expirée, reconnecte-toi');
      this.router.navigate(['/']);
      return;
    }

    this.role = role || '';
    this.username = username || '';
    this.user_id = user_id || '';
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    this.router.navigate(['/']);
  }
}
