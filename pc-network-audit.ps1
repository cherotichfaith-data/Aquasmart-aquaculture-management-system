$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$targetHost = 'fish-farm-daily-planner.pages.dev'
$targetIps = @('172.66.47.200', '172.66.44.56')
$reportPath = 'C:\Users\faith\Downloads\aquasmart1\pc-network-audit.txt'

Start-Transcript -LiteralPath $reportPath -Force

function Section([string]$name) {
    Write-Output "`n===== $name ====="
}

Section 'Audit metadata'
Get-Date -Format o
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsBuildNumber, OsArchitecture, OsUptime

Section 'Target DNS resolution'
Resolve-DnsName $targetHost | Select-Object Name, Type, IPAddress, NameHost, Server
Write-Output '-- Resolver 1.1.1.1 --'
Resolve-DnsName $targetHost -Server 1.1.1.1 -DnsOnly | Select-Object Name, Type, IPAddress, NameHost
Write-Output '-- Resolver 8.8.8.8 --'
Resolve-DnsName $targetHost -Server 8.8.8.8 -DnsOnly | Select-Object Name, Type, IPAddress, NameHost

Section 'Hosts file target entries'
Select-String -LiteralPath 'C:\Windows\System32\drivers\etc\hosts' -Pattern 'pages\.dev|172\.66\.47\.200|172\.66\.44\.56' -CaseSensitive:$false

Section 'Active network configuration'
Get-NetIPConfiguration | Where-Object { $_.NetAdapter.Status -eq 'Up' } | ForEach-Object {
    [pscustomobject]@{
        Interface = $_.InterfaceAlias
        Adapter = $_.NetAdapter.InterfaceDescription
        IPv4 = ($_.IPv4Address.IPAddress -join ', ')
        IPv6 = ($_.IPv6Address.IPAddress -join ', ')
        Gateway = ($_.IPv4DefaultGateway.NextHop -join ', ')
        DNS = ($_.DNSServer.ServerAddresses -join ', ')
    }
}
Get-NetIPInterface | Where-Object { $_.ConnectionState -eq 'Connected' } | Select-Object InterfaceAlias, AddressFamily, Dhcp, NlMtu, InterfaceMetric

Section 'Active Wi-Fi driver and advanced properties'
Get-NetAdapter | Where-Object Status -eq 'Up' | Select-Object Name, InterfaceDescription, Status, LinkSpeed, MacAddress, DriverInformation
Get-NetAdapterAdvancedProperty -Name 'Wi-Fi' | Select-Object DisplayName, DisplayValue, RegistryKeyword, RegistryValue
pnputil /enum-devices /instanceid 'PCI\VEN_10EC&DEV_B852&SUBSYS_54711A3B&REV_00\00E04CFFFE88520100' /drivers

Section 'Network adapter bindings'
Get-NetAdapterBinding -Name 'Wi-Fi' | Select-Object DisplayName, ComponentID, Enabled
netcfg -s n

Section 'Proxy and browser policy'
netsh winhttp show proxy
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' | Select-Object ProxyEnable, ProxyServer, AutoConfigURL, AutoDetect
Get-ItemProperty 'HKLM:\Software\Policies\Google\Chrome' -ErrorAction SilentlyContinue
Get-ItemProperty 'HKCU:\Software\Policies\Google\Chrome' -ErrorAction SilentlyContinue
Get-ItemProperty 'HKLM:\Software\Policies\Microsoft\Edge' -ErrorAction SilentlyContinue
Get-ItemProperty 'HKCU:\Software\Policies\Microsoft\Edge' -ErrorAction SilentlyContinue

Section 'Firewall profiles and outbound block rules'
Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction, DefaultOutboundAction
Get-NetFirewallRule -Enabled True -Direction Outbound -Action Block | Select-Object DisplayName, Profile, PolicyStoreSourceType, Owner

Section 'Routes to target Cloudflare IPs'
foreach ($ip in $targetIps) {
    Write-Output "-- $ip --"
    Find-NetRoute -RemoteIPAddress $ip | Select-Object InterfaceAlias, NextHop, RouteMetric, IPAddress
}

Section 'TCP port comparisons'
foreach ($hostName in @($targetHost, 'www.google.com', 'www.cloudflare.com')) {
    Test-NetConnection $hostName -Port 443 -InformationLevel Detailed | Select-Object ComputerName, RemoteAddress, RemotePort, NameResolutionResults, InterfaceAlias, SourceAddress, TcpTestSucceeded
}

Section 'HTTPS curl comparisons'
foreach ($url in @("https://$targetHost/", 'https://www.google.com/', 'https://www.cloudflare.com/')) {
    Write-Output "-- $url --"
    & curl.exe -4 -vkI --connect-timeout 8 --max-time 15 $url 2>&1
}

Section 'Target direct-IP HTTPS tests bypassing DNS'
foreach ($ip in $targetIps) {
    Write-Output "-- $targetHost through $ip --"
    & curl.exe -4 -vkI --http1.1 --resolve "${targetHost}:443:$ip" --connect-timeout 8 --max-time 15 "https://$targetHost/" 2>&1
}

Section 'Short target route trace'
tracert -4 -d -h 10 -w 700 $targetHost

Section 'Defender network protection configuration'
Get-MpComputerStatus | Select-Object AntivirusEnabled, AntispywareEnabled, BehaviorMonitorEnabled, IoavProtectionEnabled, NISEnabled, RealTimeProtectionEnabled
Get-MpPreference | Select-Object EnableNetworkProtection, PUAProtection, DisableRealtimeMonitoring, DisableIOAVProtection, ExclusionPath, ExclusionProcess, ExclusionExtension

Section 'Installed filtering, VPN, and security software'
$softwarePattern = 'Cloudflare|WARP|AdGuard|NextDNS|Proxifier|NetLimiter|GlassWire|Forti|Cisco AnyConnect|GlobalProtect|Pulse Secure|Ivanti|Windscribe|NordVPN|ExpressVPN|Surfshark|OpenVPN|WireGuard|Tailscale|ZeroTier|Hamachi|Zscaler|Netskope|Forcepoint|Umbrella|Bitdefender|Norton|McAfee|Kaspersky|ESET|Sophos|Avast|AVG|Malwarebytes'
$uninstallRoots = @(
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
Get-ItemProperty $uninstallRoots | Where-Object { $_.DisplayName -match $softwarePattern -or $_.Publisher -match $softwarePattern } | Select-Object DisplayName, DisplayVersion, Publisher
Get-Service | Where-Object { $_.Name -match $softwarePattern -or $_.DisplayName -match $softwarePattern } | Select-Object Name, DisplayName, Status, StartType

Section 'Recent relevant system events'
$since = (Get-Date).AddDays(-2)
Get-WinEvent -FilterHashtable @{ LogName='System'; StartTime=$since } -ErrorAction SilentlyContinue |
    Where-Object { $_.ProviderName -match 'Tcpip|Schannel|DNS|NDIS|WLAN|NetworkProfile' -or $_.Message -match 'pages\.dev|172\.66\.47\.200|172\.66\.44\.56' } |
    Select-Object -First 100 TimeCreated, Id, LevelDisplayName, ProviderName, Message

Section 'Recent Defender and filtering events mentioning target'
Get-WinEvent -FilterHashtable @{ LogName='Microsoft-Windows-Windows Defender/Operational'; StartTime=$since } -ErrorAction SilentlyContinue |
    Where-Object { $_.Message -match 'pages\.dev|172\.66\.47\.200|172\.66\.44\.56|network protection' } |
    Select-Object -First 100 TimeCreated, Id, LevelDisplayName, Message
Get-WinEvent -FilterHashtable @{ LogName='Security'; Id=5152,5157; StartTime=$since } -ErrorAction SilentlyContinue |
    Where-Object { $_.Message -match '172\.66\.47\.200|172\.66\.44\.56' } |
    Select-Object -First 100 TimeCreated, Id, Message

Stop-Transcript
Write-Output "AUDIT_REPORT=$reportPath"
