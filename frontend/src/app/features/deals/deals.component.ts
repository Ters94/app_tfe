import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DealService } from '../../services/deal.service';

@Component({
  selector: 'app-deals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './deals.component.html',
  styleUrls: ['./deals.component.css']
})
export class DealsComponent implements OnInit {

  filters: any = {
    portfolio: '',
    product: '',
    deal_type: '',
    trader_code: '',
    price_min: '',
    price_max: ''
  };

  deals: any[] = [];
  count = 0;

  constructor(private dealService: DealService) {}

  ngOnInit(): void {
    this.searchDeals();
  }

  searchDeals(): void {
    this.dealService.searchDeals(this.filters).subscribe({
      next: (response) => {
        this.deals = response.results;
        this.count = response.count;
      },
      error: (err) => {
        console.error('Erreur chargement deals', err);
      }
    });
  }

  resetFilters(): void {
    this.filters = {
      portfolio: '',
      product: '',
      deal_type: '',
      trader_code: '',
      price_min: '',
      price_max: ''
    };

    this.searchDeals();
  }
}
