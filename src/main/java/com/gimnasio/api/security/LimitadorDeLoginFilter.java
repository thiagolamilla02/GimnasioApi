package com.gimnasio.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// Corta los intentos de login de un usuario bloqueado, antes de comprobar la contraseña
public class LimitadorDeLoginFilter extends OncePerRequestFilter {

    private final LimitadorDeIntentos limitador;

    public LimitadorDeLoginFilter(LimitadorDeIntentos limitador) {
        this.limitador = limitador;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        boolean esIntentoDeLogin = "POST".equalsIgnoreCase(request.getMethod())
                && "/login".equals(request.getRequestURI());

        if (esIntentoDeLogin && limitador.estaBloqueado(request.getParameter("username"))) {
            response.setHeader("Retry-After", "900"); // segundos
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            return;
        }
        filterChain.doFilter(request, response);
    }
}