describe('Mobile App Smoke Test', () => {
    it('successfully loads the landing page', () => {
        cy.visit('/')
        // Should redirect to /login or /home depending on auth state
        // Since we are fresh, it will likely be /login
        cy.url().should('include', '/login')
        cy.contains('Connexion') // Check for text likely to be on the login page
    })
})
