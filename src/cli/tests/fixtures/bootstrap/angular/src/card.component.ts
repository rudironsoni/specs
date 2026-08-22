import { Component } from '@angular/core';
import { PrimaryButtonComponent } from './primary-button.component';

@Component({
  selector: 'legacy-card',
  standalone: true,
  imports: [PrimaryButtonComponent],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css'],
})
export class CardComponent {}
