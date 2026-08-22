import { Component } from '@angular/core';
import { PrimaryButtonComponent } from './primary-button.component';

@Component({
  selector: 'legacy-button-wrapper',
  standalone: true,
  imports: [PrimaryButtonComponent],
  template: `<legacy-primary-button appearance="primary"><ng-content></ng-content></legacy-primary-button>`,
})
export class LegacyButtonWrapper {}
