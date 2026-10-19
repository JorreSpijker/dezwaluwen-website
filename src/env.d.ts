declare namespace App {
  interface Locals {
    // Ingelogde gebruiker op /beheer en /api/beheer (gezet door src/middleware.ts)
    user?: import('./lib/admin/users').User;
  }
}
