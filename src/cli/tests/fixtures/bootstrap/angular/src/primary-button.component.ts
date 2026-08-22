import { Component, input, output } from '@angular/core';

@Component({
  selector: 'legacy-primary-button',
  standalone: true,
  template: `<button type="button" [disabled]="disabled()"><ng-content></ng-content></button>`,
  styles: [`
    button {
      background: #1a73e8;
      border-radius: 4px;
    }
  `],
})
export class PrimaryButtonComponent {
  appearance = input<'primary' | 'secondary' | 'tertiary'>('primary');
  disabled = input(false);
  loading = input(false);
  clicked = output<void>();
}
