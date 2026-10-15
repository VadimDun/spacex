
import { SpaceX } from "./api/spacex";
import * as d3 from "d3";
import * as Geo from "./geo.json";

document.addEventListener("DOMContentLoaded", setup);

async function setup() {
    const spaceX = new SpaceX();
    const listContainer = document.getElementById("listContainer");

    try {
        const [launches, allPads] = await Promise.all([
            spaceX.launches(),
            spaceX.launchpads()
        ]);

        const usedPadIds = new Set(
            launches
                .map(launch => launch.launchpad)
                .filter(id => id !== null)
        );

        const launchpads = allPads.filter(
            pad => usedPadIds.has(pad.id)
        );

        const markers = drawMap(launchpads);

        renderLaunches(launches, listContainer, markers);
    } catch (error) {
        console.error("Failed to load SpaceX data:", error);
        listContainer.textContent =
            "Не удалось загрузить данные. Проверьте Console.";
    }
}

function renderLaunches(launches, container, markers) {
    const list = document.createElement("ul");

    launches.forEach(launch => {
        const item = document.createElement("li");

        item.className = "launch-item";
        item.textContent = launch.name;

        item.addEventListener("mouseenter", () => {
            markers
                .classed(
                    "active",
                    pad => pad.properties.id === launch.launchpad
                )
                .attr("r", pad =>
                    pad.properties.id === launch.launchpad ? 8 : 4
                );
        });

        item.addEventListener("mouseleave", () => {
            markers
                .classed("active", false)
                .attr("r", 4);
        });

        list.appendChild(item);
    });

    container.replaceChildren(list);
}

function drawMap(launchpads) {
    const width = 640;
    const height = 480;
    const margin = { top: 20, right: 10, bottom: 40, left: 100 };

    const svg = d3.select("#map")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const projection = d3.geoMercator()
        .scale(100)
        .center([0, 20])
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    svg.append("g")
        .selectAll("path")
        .data(Geo.features)
        .enter()
        .append("path")
        .attr("class", "topo")
        .attr("d", path)
        .attr("fill", "#e4e9ed")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 0.5);

    const geoJSON = {
        type: "FeatureCollection",
        features: launchpads
            .filter(pad =>
                Number.isFinite(pad.latitude) &&
                Number.isFinite(pad.longitude)
            )
            .map(pad => ({
                type: "Feature",
                properties: {
                    id: pad.id,
                    name: pad.name
                },
                geometry: {
                    type: "Point",
                    coordinates: [pad.longitude, pad.latitude]
                }
            }))
    };

    const markers = svg.append("g")
        .attr("class", "launchpad-markers")
        .selectAll("circle")
        .data(geoJSON.features)
        .enter()
        .append("circle")
        .attr("class", "launchpad-marker")
        .attr("cx", pad =>
            projection(pad.geometry.coordinates)[0]
        )
        .attr("cy", pad =>
            projection(pad.geometry.coordinates)[1]
        )
        .attr("r", 4);

    markers.append("title")
        .text(pad => pad.properties.name);

    return markers;
}
