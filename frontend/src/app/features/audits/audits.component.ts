import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService, Audit, Group } from '../../services/audit.service';
import { ActivatedRoute, Router } from '@angular/router';



@Component({
  selector: 'app-audits',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audits.component.html',
  styleUrls: ['./audits.component.css']
})
export class AuditsComponent implements OnInit {

  groupId = '';
  groupSearch = '';
  selectedGroup: Group | null = null;
  filteredGroups: Group[] = [];
  audits: Audit[] = [];
  loading = false;
  errorMessage = '';
  groups: Group[] = [];
  isGroupMode : boolean = false;
  constructor(
    private auditService: AuditService,

     private route: ActivatedRoute,
      private router: Router
   ) {}

  ngOnInit(): void {
  this.route.paramMap.subscribe(params => {
    const groupId = params.get('groupId');

    this.errorMessage = '';
    this.filteredGroups = [];

    if (groupId) {
      this.isGroupMode = true;
      this.loadGroupsAndSelect(groupId);
      this.searchAudits(groupId);
    } else {
      this.isGroupMode = false;
      this.selectedGroup = null;
      this.groupSearch = '';
      this.audits = [];
      this.loadGroups();
    }
  });
}

loadGroupsAndSelect(groupId: string): void {
  this.auditService.getGroups().subscribe({
    next: (data) => {
      this.groups = data;
      this.selectedGroup = this.groups.find(group => group.id === groupId) || null;
    },
    error: () => {
      this.selectedGroup = null;
    }
  });
}
  loadGroups(): void {
    this.auditService.getGroups().subscribe({
      next: (data) => {
        console.log('GROUPES:', data);
  this.groups = data;
        this.groups = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des groupes:', err);
      }
    });
  }

   onSearchChange(): void {
    this.selectedGroup = null;
    this.audits = [];
    this.errorMessage = '';

    const search = this.groupSearch.toLowerCase().trim();

    if (!search) {
      this.filteredGroups = [];
      return;
    }

    this.filteredGroups = this.groups.filter(group =>
      group.name.toLowerCase().includes(search)
    );
  }

  selectGroup(group: Group): void {
    this.selectedGroup = group;
    this.groupSearch = group.name;
    this.filteredGroups = [];

    this.searchAudits(group.id);
  }

  searchAudits(groupId: string): void {

    this.loading = true;
    this.errorMessage = '';
    this.audits = [];

    this.auditService.getGroupAudits(groupId).subscribe({
      next: (data) => {
        this.audits = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;

        if (err.status === 403) {
          this.errorMessage = 'Accès refusé. Réservé à l’administrateur.';
        } else if (err.status === 400) {
          this.errorMessage = 'ID de groupe invalide.';
           } else if (err.status === 401) {
        this.errorMessage = 'Session expirée. Reconnecte-toi.';
        } else {
          this.errorMessage = 'Erreur lors du chargement des audits.';
        }
      }
    });
  }

  formatValues(values: any): { key: string; value: any }[] {
  if (!values) {
    return [];
  }

  return Object.keys(values).map(key => ({
    key,
    value: values[key]
  }));
}
goBack(): void {
    this.router.navigate(['/groups']);
  }
}
