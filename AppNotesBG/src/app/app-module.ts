import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore, enableIndexedDbPersistence } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { environment } from '../environments/environment';
import { authInterceptor } from './core/interceptors/auth.interceptor';

@NgModule({
  declarations: [
    App,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    RouterOutlet,
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Interceptor de auth incluido — agrega Bearer token automáticamente
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),

    // Firebase — configurado desde environment.ts
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => {
      const firestore = getFirestore();
      // Offline persistence habilitada desde el día 1 (ver NEGOCIO.md)
      enableIndexedDbPersistence(firestore).catch(() => {
        // Ignorar si ya está habilitado en otra pestaña (multi-tab no soportado)
      });
      return firestore;
    }),
    provideStorage(() => getStorage()),
  ],
  bootstrap: [App],
})
export class AppModule {}
