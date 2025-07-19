@echo off
@REM MinecraftPath: C:\Users\XXX\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe

rmdir /s /q "%MinecraftPath%\LocalState\games\com.mojang\development_behavior_packs\RideablePolarBearBP"
xcopy /I /Q /s /e ".\RideablePolarBearBP" "%MinecraftPath%\LocalState\games\com.mojang\development_behavior_packs\RideablePolarBearBP"

rmdir /s /q "%MinecraftPath%\LocalState\games\com.mojang\development_resource_packs\RideablePolarBearRP"
xcopy /I /Q /s /e ".\RideablePolarBearRP" "%MinecraftPath%\LocalState\games\com.mojang\development_resource_packs\RideablePolarBearRP"
