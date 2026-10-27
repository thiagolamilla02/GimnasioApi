package com.gimnasio.api.security;

import com.gimnasio.api.model.Usuario;
import com.gimnasio.api.repository.IUsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

// Le dice a Spring Security como buscar a un usuario cuando alguien intenta ingresar
@Service
public class UsuarioDetallesService implements UserDetailsService {

    @Autowired
    IUsuarioRepository usuarioRepo;

    @Override
    public UserDetails loadUserByUsername(String nombreUsuario) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepo.findByNombreUsuario(nombreUsuario)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        return User.withUsername(usuario.getNombreUsuario())
                .password(usuario.getClaveHash())
                .roles("ADMIN")
                .disabled(!usuario.isActivo())
                .build();
    }
}