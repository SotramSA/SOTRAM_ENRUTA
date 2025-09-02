'use client'

import { useState } from 'react'
import { Calendar, ClipboardCheck, ArrowRight, Bus, Users, CheckSquare } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null)

  const options = [
    {
      id: 'consultar-programado',
      title: 'Consultar Programado',
      description: 'Consulta los turnos programados para una fecha específica',
      icon: Calendar,
      href: '/consultarprogramado',
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverBgColor: 'hover:bg-blue-100',
      iconColor: 'text-blue-600',
      buttonColor: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700'
    },
    {
      id: 'lista-chequeo',
      title: 'Realizar Lista de Chequeo',
      description: 'Completa la lista de chequeo para un vehículo específico',
      icon: ClipboardCheck,
      href: '/listachequeo',
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverBgColor: 'hover:bg-green-100',
      iconColor: 'text-green-600',
      buttonColor: 'bg-green-600',
      buttonHover: 'hover:bg-green-700'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Bus className="w-8 h-8 text-purple-600" />
                <span className="text-2xl font-bold text-gray-900">EnRuta</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/login"
                className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg transition-colors"
              >
                Iniciar Sesión
              </Link>
              
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-white p-4 rounded-full shadow-lg">
                <Bus className="w-16 h-16 text-purple-600" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Bienvenido a <span className="text-purple-600">EnRuta</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Sistema integral de gestión de transporte público. 
              Consulta turnos programados y realiza listas de chequeo de manera eficiente.
            </p>
          </div>

          
        </div>

        {/* Options Section */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              ¿Qué necesitas hacer hoy?
            </h2>
            <p className="text-lg text-gray-600">
              Selecciona una de las siguientes opciones para continuar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {options.map((option) => (
              <Link
                key={option.id}
                href={option.href}
                className={`group block ${option.bgColor} ${option.borderColor} ${option.hoverBgColor} border-2 rounded-xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-lg`}
                onMouseEnter={() => setHoveredOption(option.id)}
                onMouseLeave={() => setHoveredOption(null)}
              >
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 ${option.bgColor} rounded-full mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <option.icon className={`w-8 h-8 ${option.iconColor}`} />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {option.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    {option.description}
                  </p>
                  
                  <div className={`inline-flex items-center space-x-2 ${option.buttonColor} ${option.buttonHover} text-white px-6 py-3 rounded-lg transition-colors duration-300`}>
                    <span className="font-medium">Continuar</span>
                    <ArrowRight className={`w-4 h-4 transition-transform duration-300 ${
                      hoveredOption === option.id ? 'translate-x-1' : ''
                    }`} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Bus className="w-6 h-6 text-purple-400" />
              <span className="text-xl font-bold">EnRuta</span>
            </div>
            <p className="text-gray-400">
              Sistema de gestión de transporte público
            </p>
            <p className="text-gray-500 text-sm mt-2">
              © 2025 EnRuta. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
