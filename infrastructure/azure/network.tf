# A VNet with one subnet for the Container Apps environment. VNet integration
# is free on the Consumption plan and lets the storage account accept traffic
# from this subnet only (see storage.tf).

module "nsg" {
  source  = "Azure/avm-res-network-networksecuritygroup/azurerm"
  version = "~> 0.5"
  count   = var.create ? 1 : 0

  name                = "nsg-${local.name}-aca"
  location            = var.location
  resource_group_name = module.resource_group[0].name
  tags                = local.tags
  enable_telemetry    = var.enable_telemetry

  # The environment's public load balancer forwards HTTP(S) into the subnet.
  # Azure's default rules already allow the load balancer probes and all
  # outbound traffic.
  security_rules = {
    allow_web_inbound = {
      name                       = "AllowWebInbound"
      priority                   = 100
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_address_prefix      = var.ingress_allowed_cidr
      source_port_range          = "*"
      destination_address_prefix = var.aca_subnet_cidr
      destination_port_ranges    = ["80", "443"]
      description                = "Visitors reaching the app"
    }
  }
}

module "vnet" {
  source  = "Azure/avm-res-network-virtualnetwork/azurerm"
  version = "~> 0.22"
  count   = var.create ? 1 : 0

  name             = "vnet-${local.name}"
  location         = var.location
  parent_id        = module.resource_group[0].resource_id
  address_space    = [var.vnet_address_space]
  tags             = local.tags
  enable_telemetry = var.enable_telemetry

  subnets = {
    aca = {
      name           = "snet-aca"
      address_prefix = var.aca_subnet_cidr

      # The subnet belongs to the Container Apps environment
      delegations = [
        {
          name               = "Microsoft.App.environments"
          service_delegation = { name = "Microsoft.App/environments" }
        }
      ]

      # Lets the storage firewall recognise traffic from this subnet
      service_endpoints = ["Microsoft.Storage"]

      network_security_group = { id = module.nsg[0].resource_id }
    }
  }
}

locals {
  # try(): with create = false there is no VNet
  aca_subnet_id = try(module.vnet[0].subnets["aca"].resource_id, null)
}
