import { Component } from '@angular/core';
import { GameGridComponent } from './components/game-grid/game-grid.component';

@Component({
  selector: 'app-root',
  imports: [GameGridComponent],
  template: `<app-game-grid></app-game-grid>`,
  styles: []
})
export class App {
}