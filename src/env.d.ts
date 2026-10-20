declare namespace App {
  interface Locals {
    // Ingelogde gebruiker op /cms en /api/cms (gezet door src/middleware.ts)
    user?: import('./lib/admin/users').User;
  }
}
