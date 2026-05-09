import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService, Audit, Group } from '../../services/audit.service';
import { ActivatedRoute, Router } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-audits',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audits.component.html',
  styleUrls: ['./audits.component.css'],
  providers: [DatePipe],
})
export class AuditsComponent implements OnInit {

  groupId = '';
  groupSearch = '';
  selectedGroup: Group | null = null;
  filteredGroups: Group[] = [];
  audits: Audit[] = [];
  loading = false;
  pdfLoading = false;
  errorMessage = '';
  groups: Group[] = [];
  isGroupMode = false;

  constructor(
    private auditService: AuditService,
    private route: ActivatedRoute,
    private router: Router,
    private datePipe: DatePipe,
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
        this.selectedGroup = this.groups.find(g => g.id === groupId) || null;
      },
      error: () => { this.selectedGroup = null; }
    });
  }

  loadGroups(): void {
    this.auditService.getGroups().subscribe({
      next: (data) => { this.groups = data; },
      error: (err) => { console.error('Erreur chargement groupes:', err); }
    });
  }

  onSearchChange(): void {
    this.selectedGroup = null;
    this.audits = [];
    this.errorMessage = '';
    const search = this.groupSearch.toLowerCase().trim();
    if (!search) { this.filteredGroups = []; return; }
    this.filteredGroups = this.groups.filter(g => g.name.toLowerCase().includes(search));
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
      next: (data) => { this.audits = data; this.loading = false; },
      error: (err) => {
        this.loading = false;
        if      (err.status === 403) this.errorMessage = "Accès refusé. Réservé à l'administrateur.";
        else if (err.status === 400) this.errorMessage = 'ID de groupe invalide.';
        else if (err.status === 401) this.errorMessage = 'Session expirée. Reconnecte-toi.';
        else                         this.errorMessage = 'Erreur lors du chargement des audits.';
      }
    });
  }

  formatAuditValue(value: any): string {
    if (value === null || value === undefined) return 'Aucune';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return value.toString();
  }

  formatValues(values: any): { key: string; value: any }[] {
    if (!values) return [];
    return Object.keys(values).map(key => ({ key, value: values[key] }));
  }

  isObject(value: any): boolean {
    return value !== null && typeof value === 'object';
  }

  goBack(): void {
    this.router.navigate(['/groups']);
  }

  exportPdf(): void {
    if (this.audits.length === 0 || this.pdfLoading) return;
    this.pdfLoading = true;

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const groupName = this.selectedGroup?.name ?? 'Tous les groupes';
      const generatedAt = this.datePipe.transform(new Date(), 'dd/MM/yyyy HH:mm') ?? '';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(17, 24, 39);
      doc.text("Journal d'audit", 14, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`Groupe : ${groupName}`, 14, 26);
      doc.text(`Généré le ${generatedAt}`, 14, 32);


      const headers = ['Date', 'Action', 'Cible', 'Utilisateur', 'Anciennes valeurs', 'Nouvelles valeurs'];

      const rows = this.audits.map(audit => [
        this.datePipe.transform(audit.timestamp, 'dd/MM/yyyy HH:mm') ?? '',
        audit.action,
        `${audit.target_type} - ${audit.target_label}`,
        audit.username ?? audit.user_id ?? '',
        this.flattenValues(audit.old_values),
        this.flattenValues(audit.new_values),
      ]);

      const actionColors: Record<string, [number, number, number]> = {
        REMOVE_MEMBER: [185,  28,  28],
        DELETE_QUERY:  [194,  65,  12],
        UPDATE_QUERY:  [ 29,  78, 216],
        ADD_MEMBER:    [ 21, 128,  61],
        CREATE_QUERY:  [109,  40, 217],
      };

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 38,
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 3,
          valign: 'top',
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [249, 250, 251],
          textColor: [107, 114, 128],
          fontStyle: 'bold',
          lineColor: [229, 231, 235],
          lineWidth: 0.3,
        },
        bodyStyles: {
          textColor: [55, 65, 81],
          lineColor: [243, 244, 246],
          lineWidth: 0.2,
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 36 },
          2: { cellWidth: 42 },
          3: { cellWidth: 26 },
          4: { cellWidth: 'auto' },
          5: { cellWidth: 'auto' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const action = String(data.cell.raw ?? '');
            if (actionColors[action]) {
              data.cell.styles.textColor = actionColors[action];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        didDrawPage: (data) => {
          const total = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(156, 163, 175);
          doc.text(
            `Page ${data.pageNumber} / ${total}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 8,
            { align: 'center' }
          );
        },
      });

      const filename = `audit_${groupName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      doc.save(filename);

    } catch (err) {
      console.error('Erreur génération PDF:', err);
    } finally {
      this.pdfLoading = false;
    }
  }

  private flattenValues(values: any): string {
    if (!values || Object.keys(values).length === 0) return '—';
    return Object.entries(values)
      .map(([k, v]) => {
        const val = typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v);
        return `${k}: ${val}`;
      })
      .join('\n');
  }
}
