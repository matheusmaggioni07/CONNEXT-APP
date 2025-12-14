export function generateFallbackCode(prompt: string) {
  return `
"use client"

import React from 'react';

export default function FallbackSite() {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert('Mensagem enviada com sucesso!');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <nav className="fixed w-full z-50 bg-black/50 backdrop-blur-xl p-4">
        <div className="container mx-auto flex justify-between items-center">
          <a href="#inicio" className="text-2xl font-bold text-purple-400">
            Meu Site
          </a>
          <div className="hidden md:flex space-x-6">
            <a href="#inicio" onClick={(e) => { e.preventDefault(); scrollToSection('inicio'); }} className="hover:text-purple-300 transition duration-300">Início</a>
            <a href="#sobre" onClick={(e) => { e.preventDefault(); scrollToSection('sobre'); }} className="hover:text-purple-300 transition duration-300">Sobre</a>
            <a href="#servicos" onClick={(e) => { e.preventDefault(); scrollToSection('servicos'); }} className="hover:text-purple-300 transition duration-300">Serviços</a>
            <a href="#contato" onClick={(e) => { e.preventDefault(); scrollToSection('contato'); }} className="hover:text-purple-300 transition duration-300">Contato</a>
          </div>
          <button
            onClick={() => scrollToSection('contato')}
            className="bg-gradient-to-br from-purple-500 to-pink-500 text-white px-8 py-3 rounded-full font-semibold hover:scale-105 transition duration-300"
          >
            Fale Conosco
          </button>
        </div>
      </nav>

      <main className="pt-20">
        <section id="inicio" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#030014] to-black">
          <div className="text-center px-4">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-4">
              Bem-vindo ao Site Gerado para: {prompt}
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Este é um site de exemplo gerado automaticamente. Personalize-o para atender às suas necessidades.
            </p>
            <button
              onClick={() => scrollToSection('contato')}
              className="bg-gradient-to-br from-purple-500 to-pink-500 text-white px-8 py-4 rounded-full font-semibold hover:scale-105 transition duration-300"
            >
              Saiba Mais
            </button>
          </div>
        </section>

        <section id="sobre" className="py-32 container mx-auto px-4">
          <h2 className="text-5xl font-bold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">Sobre Nós</h2>
          <p className="text-lg text-gray-300 text-center max-w-3xl mx-auto">
            Somos uma equipe dedicada a criar soluções incríveis. Com foco em inovação e qualidade, transformamos ideias em realidade.
          </p>
        </section>

        <section id="servicos" className="py-32 container mx-auto px-4">
          <h2 className="text-5xl font-bold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">Nossos Serviços</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 p-8 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300">
              <h3 className="text-2xl font-bold mb-4">Desenvolvimento Web</h3>
              <p className="text-gray-400">Criamos sites responsivos e funcionais, focados na experiência do usuário.</p>
            </div>
            <div className="bg-white/5 p-8 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300">
              <h3 className="text-2xl font-bold mb-4">Design UI/UX</h3>
              <p className="text-gray-400">Soluções de design que encantam e convertem, pensando em cada detalhe.</p>
            </div>
            <div className="bg-white/5 p-8 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300">
              <h3 className="text-2xl font-bold mb-4">Consultoria</h3>
              <p className="text-gray-400">Orientamos seu projeto com expertise e estratégia para o sucesso.</p>
            </div>
          </div>
        </section>

        <section id="contato" className="py-32 container mx-auto px-4">
          <h2 className="text-5xl font-bold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200">Entre em Contato</h2>
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white/5 p-8 rounded-2xl border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input type="text" name="nome" placeholder="Nome" required className="bg-transparent border border-white/20 p-4 rounded-lg focus:outline-none focus:border-purple-500 transition duration-300" />
              <input type="email" name="email" placeholder="Email" required className="bg-transparent border border-white/20 p-4 rounded-lg focus:outline-none focus:border-purple-500 transition duration-300" />
            </div>
            <textarea name="mensagem" placeholder="Mensagem" required className="bg-transparent border border-white/20 p-4 rounded-lg mt-6 w-full h-32 focus:outline-none focus:border-purple-500 transition duration-300"></textarea>
            <button type="submit" className="mt-6 bg-gradient-to-br from-purple-500 to-pink-500 text-white px-8 py-4 rounded-full font-semibold hover:scale-105 transition duration-300 w-full">Enviar</button>
          </form>
        </section>
      </main>

      <footer className="py-10 text-center text-gray-500">
        © 2025 Meu Site. Todos os direitos reservados.
      </footer>
    </div>
  );
}
  `
}
