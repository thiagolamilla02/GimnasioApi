package com.gimnasio.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// Fuerza a que el token CSRF se cargue y se escriba en la cookie XSRF-TOKEN en CADA respuesta.
// Sin esto, la cookie solo aparece despues de que una peticion falla con 403.
public class CsrfCookieFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        CsrfToken token = (CsrfToken) request.getAttribute("_csrf");
        if (token != null) {
            token.getToken(); // pedir el valor hace que el token diferido se cargue y se guarde en la cookie
        }
        filterChain.doFilter(request, response);
    }
}