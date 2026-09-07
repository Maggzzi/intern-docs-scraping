import { Platform } from "./base";
import { Marktplaats } from "./marktplaats";
import { Asos } from "./asos";
import { Mediamarkt } from "./mediamarkt";

//Defines a type for a class constructor that implements the Platform interface
type PlatformConstructor = new () => Platform;

//Registers platforms using key-value mapping objects
export const platformRegistry: Record<string, PlatformConstructor> = {
    marktplaats: Marktplaats,
    asos: Asos,
    mediamarkt: Mediamarkt
}