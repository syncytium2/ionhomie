// The reading order (docs/adr/0001). A chapter is added here once; the title row, the home page's
// list and the routes all read from it.
import type { ComponentType } from "react";
import Diffusion from "./Diffusion.tsx";
import Drift from "./Drift.tsx";
import Compartments from "./Compartments.tsx";
import OneChannel from "./OneChannel.tsx";
import Ghk from "./Ghk.tsx";
import Rundown from "./Rundown.tsx";
import Pumps from "./Pumps.tsx";
import Chloride from "./Chloride.tsx";

export interface Chapter { slug: string; title: string; line: string; C: ComponentType }

export const CHAPTERS: Chapter[] = [
  { slug: "diffusion", title: "Diffusion", line: "Fick's law by random walk: spreading time grows with distance squared.", C: Diffusion },
  { slug: "drift", title: "Drift", line: "A field moves charged ions; against a gradient, zero net flux is the Nernst equation.", C: Drift },
  { slug: "compartments", title: "Compartments", line: "A membrane, two volumes, trapped anions, and how little charge Vm takes.", C: Compartments },
  { slug: "one-channel", title: "One channel", line: "Open a selective channel and watch Vm run to that ion's Nernst potential.", C: OneChannel },
  { slug: "ghk", title: "Two ions and GHK", line: "Vm between the ticks, weighted by permeability: a steady state, not an equilibrium.", C: Ghk },
  { slug: "rundown", title: "Rundown", line: "Leaks and no pump: gradients decay, Vm drifts toward zero, the cell swells.", C: Rundown },
  { slug: "pumps", title: "Pumps", line: "The Na⁺/K⁺-ATPase holds the gradients and the volume; PMCA holds Ca²⁺.", C: Pumps },
  { slug: "chloride", title: "Chloride", line: "NKCC1 and KCC2, running on the pump's gradients, set E_Cl and so E_GABA.", C: Chloride },
];
