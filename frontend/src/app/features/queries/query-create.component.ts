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
  showCreateForm: boolean = true;

  groupId: string = '';
  group: any = null;
  groups: any[] = [];
selectedGroupId: string = '';
isGroupFixed: boolean = false;

  dataFields: string[] = [
  'Portfolio',
  'PortfolioGOP',
  'Folder',
  'Activity',
  'Desk',
  'Direction',
  'Entity',
  'Quantity',
  'CreationDate',
  'DeliveryPoint',
  'TransportCorridor',
  'DeliveryType',
  'DealId',
  'QuantityUnit',
  'TradeDate',
  'DealType',
  'TraderCode',
  'Price',
  'Cash',
  'MarginCost',
  'TotalMarginCost',
  'OpenQuantity',
  'BookingStatus',
  'CommodityFixingSource',
  'AverageType',
  'AuctionType',
  'BusinessUnit'
];

dealFilters: any = {
  portfolio: '',
  product: '',
  deal_type: '',
  trader_code: '',
  price_min: '',
  price_max: ''
};

dealsResults: any[] = [];
dealsCount = 0;

selectedDataFields: any = {
  Portfolio: true,
  PortfolioGOP: false,
  Folder: false,
  Activity: false,
  Desk: false,
  Direction: false,
  Entity: false,
  Quantity: true,
  CreationDate: false,
  DeliveryPoint: false,
  TransportCorridor: false,
  DeliveryType: false,
  DealId: false,
  QuantityUnit: false,
  TradeDate: false,
  DealType: false,
  TraderCode: false,
  Price: false,
  Cash: false,
  MarginCost: false,
  TotalMarginCost: false,
  OpenQuantity: false,
  BookingStatus: false,
  CommodityFixingSource: false,
  AverageType: false,
  AuctionType: false,
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

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
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

  getHeaders() {
    const token = localStorage.getItem('token');

    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }

  loadFilterOptions(): void {
  this.http.get<any>(
    'http://127.0.0.1:8000/deals/filter-options',
    this.getHeaders()
  ).subscribe({
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

loadMyGroups(): void {
  this.http.get<any[]>(
    'http://127.0.0.1:8000/groups/',
    this.getHeaders()
  ).subscribe({
    next: (data) => {
      this.groups = data;
    },
    error: (err) => {
      console.error('Erreur chargement groupes', err);
    }
  });
}
  searchDeals(): void {
     console.log('Bouton rechercher cliqué');
  console.log('Filtres envoyés :', this.dealFilters);

  this.http.get<any>(
    'http://127.0.0.1:8000/deals/search',
    {
      ...this.getHeaders(),
      params: this.dealFilters
    }
  ).subscribe({
    next: (response) => {
      this.dealsResults = response.results || [];
      this.dealsCount = response.count || 0;
    },
    error: (err) => {
      console.error('Erreur recherche deals', err);
    }
  });
}

 createQuery() {
   const finalGroupId = this.isGroupFixed ? this.groupId : this.selectedGroupId;

    if (!this.newQueryName || this.newQueryName.trim() === '') {
    alert('Le nom de la query est obligatoire.');
    return;
  }

  if (!finalGroupId) {
    alert('Veuillez sélectionner un groupe.');
    return;
  }

  const body = {
    query_name: this.newQueryName.trim(),
    filters: this.dealFilters,
    group_id: finalGroupId,
    selected_fields: this.selectedDataFields
  };

  this.http.post(
    'http://127.0.0.1:8000/queries/',
    body,
    this.getHeaders()
  ).subscribe({
    next: () => {
      this.router.navigate(['/groups', finalGroupId]);
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
