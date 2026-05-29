import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  currentName: string = '';
  isDark: boolean = false;
  currentUserId: string = '';


  constructor(private router: Router) {}

  ngOnInit(): void {
    this.currentName = localStorage.getItem('name') || '';
    this.currentUserId = localStorage.getItem('user_id') || '';

    const saved = localStorage.getItem('theme');
    this.isDark = saved
      ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme();
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/']);
  }

  isAdmin(): boolean {
    return localStorage.getItem('role') === 'ADMIN';
  }
}
