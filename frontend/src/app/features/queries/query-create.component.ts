import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

const PRODUCT_PORTFOLIO_MAP: Record<string, string[]> = {
  CO2:         ['CO2_BE', 'CO2_EU'],
  GAS:         ['Gas_BE', 'Gas_FR', 'Gas_NL'],
  OIL:         ['Oil_BE', 'Oil_FR'],
  ELECTRICITY: ['Elec_BE', 'Elec_FR', 'Elec_NL'],
};
@Component({
  selector: 'app-query-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './query-create.component.html',
  styleUrls: ['./query-create.component.css']
})
export class QueryCreateComponent implements OnInit {


  newQueryName: string = '';
  errorMessage: string = '';
  showCreateForm: boolean = true;
  groupId: string = '';
  group: any = null;
  groups: any[] = [];
selectedGroupId: string = '';
isGroupFixed: boolean = false;
searchDone   = false;
totalVolume  = 0;
totalAmount  = 0;
averagePrice = 0;
today: string = new Date().toISOString().split('T')[0];

 dataFields: string[] = [

   'TradeDate',
  'DealId',
  'Portfolio',
  'Desk',
  'Entity',
  'Direction',
  'Quantity',
  'QuantityUnit',
  'DeliveryPoint',
  'CounterpartyName',
  'TransportCorridor',
  'DeliveryType',
  'DealType',
  'TraderCode',
  'Price',
  'Cash',
  'OpenQuantity',
  'BookingStatus',
  'MarginCost',
  'TotalMarginCost',
  'BusinessUnit'
];

dealFilters: any = {
  portfolio: '',
  product: '',
  deal_type: '',
  trader_code: '',
  start_date: '',
  end_date: '',
  price_min: '',
  price_max: ''
};

dealsResults: any[] = [];
dealsCount = 0;

selectedDataFields: any = {
  DealId: true,
  TradeDate: true,
  Portfolio: true,
  Desk: false,
  Entity: true,
  Direction: false,
  Quantity: true,
  QuantityUnit: false,
  DeliveryPoint: false,
  CounterpartyName: true,
  TransportCorridor: false,
  DeliveryType: false,
  DealType: true,
  TraderCode: false,
  Price: true,
  Cash: false,
  OpenQuantity: false,
  BookingStatus: false,
  MarginCost: false,
  TotalMarginCost: false,
  BusinessUnit: false
};
filterOptions: any = {
  portfolio: [],
  product: [],
  deal_type: [],
  trader_code: [],
  counterparty_name: [],
  business_unit: [],
  delivery_point: [],
  booking_status: []
};

get filteredPortfolios(): string[] {
    const product = this.dealFilters.product;
    if (!product) return this.filterOptions.portfolio || [];
    return PRODUCT_PORTFOLIO_MAP[product] || [];
  }
  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    if (localStorage.getItem('role') === 'ADMIN') {
      this.router.navigate(['/queries']);
      return;
    }
    this.groupId = this.route.snapshot.queryParamMap.get('groupId') || '';
     if (this.groupId) {
    this.isGroupFixed = true;
    this.selectedGroupId = this.groupId;
    this.loadGroup();
  } else {
    this.isGroupFixed = false;
    this.loadMyGroups();

  }
  this.loadFilterOptions();
  }

  onProductChange(): void {
    const allowed = this.filteredPortfolios;
    if (this.dealFilters.portfolio && !allowed.includes(this.dealFilters.portfolio)) {
      this.dealFilters.portfolio = '';
    }
  }

  loadFilterOptions(): void {
  this.http.get<any>('/api/deals/filter-options').subscribe({
    next: (data) => {
        console.log('FILTER OPTIONS =', data);
      this.filterOptions = data;
    },
    error: (err) => {
      console.error('Erreur chargement options filtres', err);
    }
  });
}

  loadGroup() {
    this.http.get<any>(`/api/groups/${this.groupId}`).subscribe({
      next: (data) => {
        this.group = data;
      },
      error: (err) => {
        console.error('Erreur chargement group', err);
      }
    });
  }

loadMyGroups(): void {
  this.http.get<any[]>('/api/groups/my-groups').subscribe({
    next: (data) => {
      console.log('MY GROUPS =', data);
      this.groups = data;
    },
    error: (err) => {
      console.error('Erreur chargement groupes utilisateur', err);
    }
  });
}
 searchDeals(): void {
  console.log('Bouton rechercher cliqué');
  console.log('Filtres avant nettoyage :', this.dealFilters);

  const cleanFilters: any = {};

  Object.keys(this.dealFilters).forEach(key => {
    const value = this.dealFilters[key];

    if (value !== null && value !== '') {
      cleanFilters[key] = value;
    }
  });

  console.log('Filtres envoyés :', cleanFilters);

  this.http.get<any>('/api/deals/search', { params: cleanFilters }).subscribe({
    next: (response) => {
      const results = response.results || [];
      results.sort((a: any, b: any) => {
        const da = a.trade_date || '';
        const db = b.trade_date || '';
        if (da === db) return 0;
        return da < db ? -1 : 1;
      });
      this.dealsResults = results;
      this.dealsCount   = response.count || results.length;
      this.searchDone   = true;
      this.totalVolume  = results.reduce((sum: number, d: any) => sum + (d.volume || 0), 0);
      this.totalAmount  = results.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
      this.averagePrice = this.totalVolume > 0
        ? Math.round((this.totalAmount / this.totalVolume) * 100) / 100
        : 0;
    },
    error: (err) => {
      console.error('Erreur recherche deals', err);
      this.searchDone = true;
  }
  });
}
  createQuery() {
  const finalGroupId = this.isGroupFixed ? this.groupId : this.selectedGroupId;

  if (!this.newQueryName || this.newQueryName.trim() === '') {
    this.errorMessage = 'Le nom de la requête est obligatoire.';
    return;
  }

  if (!finalGroupId) {
    this.errorMessage = 'Veuillez sélectionner un groupe.';
    return;
  }

  const cleanFilters: any = {};

  Object.keys(this.dealFilters).forEach(key => {
    const value = this.dealFilters[key];

    if (value !== null && value !== '') {
      cleanFilters[key] = value;
    }
  });

  const body = {
    query_name: this.newQueryName.trim(),
    filters: cleanFilters,
    group_id: finalGroupId,
    selected_fields: this.selectedDataFields
  };

  this.http.post('/api/queries/', body).subscribe({
    next: () => {
      this.router.navigate(['/groups', finalGroupId]);
    },
    error: (err) => {
      console.error('Erreur création query', err);
    }
  });
}
  goBack(): void {
    const finalGroupId = this.isGroupFixed ? this.groupId : this.selectedGroupId;
    if (finalGroupId) {
      this.router.navigate(['/groups', finalGroupId]);
    } else {
      this.router.navigate(['/groups']);
    }
  }
  logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  localStorage.removeItem('user_id');
  this.router.navigate(['/']);
}
}
