package com.gimnasio.api.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.security.web.csrf.CsrfFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // Para cifrar y comparar contraseñas
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        // CSRF: el token viaja en la cookie XSRF-TOKEN y el front lo reenvia en la cabecera X-XSRF-TOKEN.
        // Con el atributo "_csrf" el token se carga en cada peticion (asi la cookie llega desde la primera).
        CsrfTokenRequestAttributeHandler manejadorCsrf = new CsrfTokenRequestAttributeHandler();
        manejadorCsrf.setCsrfRequestAttributeName("_csrf");

        // Las llamadas a la API sin sesion deben recibir 401, no una redireccion a la pagina de login
        RequestMatcher esLlamadaApi = peticion -> {
            String ruta = peticion.getRequestURI();
            return ruta.startsWith("/socios") || ruta.startsWith("/pagos") || ruta.startsWith("/importacion");
        };

        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(manejadorCsrf))

                .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)

                .authorizeHttpRequests(auth -> auth
                        // Lo unico publico: la pagina de login y sus archivos
                        .requestMatchers("/login.html", "/css/**", "/js/login.js", "/js/seguridad.js", "/error")
                        .permitAll()
                        .anyRequest().authenticated())

                // El login lo envia el JavaScript con fetch: se responde solo con un codigo (200 o 401)
                .formLogin(form -> form
                        .loginPage("/login.html")
                        .loginProcessingUrl("/login")
                        .successHandler((peticion, respuesta, autenticacion) ->
                                respuesta.setStatus(HttpServletResponse.SC_OK))
                        .failureHandler((peticion, respuesta, error) ->
                                respuesta.setStatus(HttpServletResponse.SC_UNAUTHORIZED))
                        .permitAll())

                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessHandler((peticion, respuesta, autenticacion) ->
                                respuesta.setStatus(HttpServletResponse.SC_OK)))

                .exceptionHandling(errores -> errores
                        .defaultAuthenticationEntryPointFor(
                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED), esLlamadaApi));

        return http.build();
    }
}