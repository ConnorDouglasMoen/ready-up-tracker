import { useState, useEffect } from "react";

export default function ReadyUpInitiativeTracker() {
  const [combatants, setCombatants] = useState([]);
  const [newCombatant, setNewCombatant] = useState({
    name: "",
    dexterity: 10,
    modifier: 0,
    initiative: 0,
    isPC: false,
    notes: "",
  });
  const [nameInput, setNameInput] = useState("");
  const [dexInput, setDexInput] = useState(10);
  const [modInput, setModInput] = useState(0);
  const [isPC, setIsPC] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [actionCost, setActionCost] = useState(0);
  const [isInterruptMode, setIsInterruptMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [roundCount, setRoundCount] = useState(1);
  const INITIATIVE_MAX = 25;

  // Calculate modifier from dexterity score
  useEffect(() => {
    const calculatedMod = Math.floor((dexInput - 10) / 2);
    setModInput(calculatedMod);
  }, [dexInput]);

  // Sort combatants by initiative
  useEffect(() => {
    const sortedCombatants = [...combatants].sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative;
      }
      return b.dexterity - a.dexterity;
    });

    if (JSON.stringify(sortedCombatants) !== JSON.stringify(combatants)) {
      setCombatants(sortedCombatants);

      // Ensure the active menu stays with the active combatant
      if (activeId) {
        const newIndex = sortedCombatants.findIndex((c) => c.id === activeId);
        if (newIndex !== -1) {
          setActiveIndex(newIndex);
        }
      }
    }
  }, [combatants, activeId]);

  const handleAddCombatant = () => {
    if (!nameInput) return;

    const newChar = {
      id: Date.now().toString(),
      name: nameInput,
      dexterity: dexInput,
      modifier: modInput,
      initiative: 0, // Will be set by roll
      isPC: isPC,
      notes: "",
      exhaustion: 0,
    };

    setCombatants([...combatants, newChar]);
    setNameInput("");
    setDexInput(10);
    setModInput(0);
    setIsPC(false);
  };

  const rollInitiative = (id) => {
    setCombatants(
      combatants.map((c) => {
        if (c.id === id) {
          const roll = Math.floor(Math.random() * 20) + 1;
          const initiativeValue =
            roll === 20 ? INITIATIVE_MAX : roll + c.modifier;

          // Add to history
          setHistory((prev) => [
            ...prev,
            `${c.name} rolled initiative: ${roll}${
              c.modifier > 0
                ? "+" + c.modifier
                : c.modifier < 0
                ? c.modifier
                : ""
            } = ${initiativeValue}`,
          ]);

          return { ...c, initiative: initiativeValue };
        }
        return c;
      })
    );
  };

  const rollAllInitiative = () => {
    setCombatants(
      combatants.map((c) => {
        const roll = Math.floor(Math.random() * 20) + 1;
        const initiativeValue =
          roll === 20 ? INITIATIVE_MAX : roll + c.modifier;

        // Add to history
        setHistory((prev) => [
          ...prev,
          `${c.name} rolled initiative: ${roll}${
            c.modifier > 0 ? "+" + c.modifier : c.modifier < 0 ? c.modifier : ""
          } = ${initiativeValue}`,
        ]);

        return { ...c, initiative: initiativeValue };
      })
    );
  };

  const removeCombatant = (id) => {
    if (activeId === id) {
      setActiveIndex(null);
      setActiveId(null);
    }
    setCombatants(combatants.filter((c) => c.id !== id));
  };

  const takeAction = (id, cost, skipInterruptCheck = false) => {
    if (!cost) return;

    const finalCost =
      !skipInterruptCheck && isInterruptMode
        ? parseInt(cost) + 2
        : parseInt(cost);
    const character = combatants.find((c) => c.id === id);

    if (character && character.initiative >= finalCost) {
      setCombatants(
        combatants.map((c) => {
          if (c.id === id) {
            const newInitiative = Math.max(0, c.initiative - finalCost);

            // Add to history
            setHistory((prev) => [
              ...prev,
              `${c.name} ${
                isInterruptMode ? "interrupts and " : ""
              }takes action costing ${finalCost} initiative (${
                c.initiative
              } → ${newInitiative})`,
            ]);

            return { ...c, initiative: newInitiative };
          }
          return c;
        })
      );
      setActionCost(0);
    }
  };

  const newRound = () => {
    setCombatants(
      combatants.map((c) => {
        const gainedInitiative = c.hasHaste ? 16 : 8;
        const newInitiative = Math.min(
          INITIATIVE_MAX,
          c.initiative + gainedInitiative
        );

        return {
          ...c,
          initiative: newInitiative,
          hasOverexerted: false,
        };
      })
    );

    setRoundCount(roundCount + 1);

    // Add to history
    setHistory((prev) => [
      ...prev,
      `-- Round ${
        roundCount + 1
      } begins! All combatants ready up (+8 initiative) --`,
    ]);
  };

  const overexert = (id) => {
    setCombatants(
      combatants.map((c) => {
        if (c.id === id && !c.hasOverexerted) {
          const newInitiative = Math.min(INITIATIVE_MAX, c.initiative + 8);
          const newExhaustion = c.exhaustion + 1;

          // Add to history
          setHistory((prev) => [
            ...prev,
            `${c.name} overexerts (+8 initiative, +1 exhaustion)`,
          ]);

          return {
            ...c,
            initiative: newInitiative,
            exhaustion: newExhaustion,
            hasOverexerted: true,
          };
        }
        return c;
      })
    );
  };

  const toggleHaste = (id) => {
    setCombatants(
      combatants.map((c) => {
        if (c.id === id) {
          return { ...c, hasHaste: !c.hasHaste };
        }
        return c;
      })
    );
  };

  const adjustInitiative = (id, amount) => {
    setCombatants(
      combatants.map((c) => {
        if (c.id === id) {
          const newInitiative = Math.min(
            INITIATIVE_MAX,
            Math.max(0, c.initiative + amount)
          );

          // Add to history
          setHistory((prev) => [
            ...prev,
            `${c.name}'s initiative ${
              amount >= 0 ? "increased" : "decreased"
            } by ${Math.abs(amount)} (${c.initiative} → ${newInitiative})`,
          ]);

          return { ...c, initiative: newInitiative };
        }
        return c;
      })
    );
  };

  const adjustExhaustion = (id, amount) => {
    setCombatants(
      combatants.map((c) => {
        if (c.id === id) {
          const newExhaustion = Math.max(0, c.exhaustion + amount);
          return { ...c, exhaustion: newExhaustion };
        }
        return c;
      })
    );
  };

  const updateNotes = (id, notes) => {
    setCombatants(
      combatants.map((c) => {
        if (c.id === id) {
          return { ...c, notes };
        }
        return c;
      })
    );
  };

  const resetTracker = () => {
    const handleResetConfirmation = () => {
      const userConfirmed = window.confirm(
        "Are you sure you want to reset the tracker? This will remove all combatants."
      );
      if (userConfirmed) {
        setCombatants([]);
        setHistory([]);
        setRoundCount(1);
        setActiveIndex(null);
        setActiveId(null);
        setActionCost(0);
        setIsInterruptMode(false);
      }
    };

    handleResetConfirmation();
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const toggleActive = (index, id) => {
    if (activeIndex === index) {
      setActiveIndex(null);
      setActiveId(null);
    } else {
      setActiveIndex(index);
      setActiveId(id);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-100">
      <header className="bg-indigo-700 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">Ready Up Initiative Tracker</h1>
        <p className="text-sm opacity-80">D&D 5e Homebrew Initiative System</p>
      </header>

      {/* Main content area with three columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column - Add Combatant Form */}
        <div className="w-1/4 flex flex-col bg-gray-50 border-r border-gray-300 p-4">
          <h2 className="text-gray-500 font-bold mb-4">Add Combatant</h2>
          <div className="space-y-4">
            <div>
              <label className="text-gray-500 block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Character Name"
                className="text-gray-500 w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="text-gray-500 block text-sm font-medium mb-1">
                DEX Score
              </label>
              <input
                type="number"
                value={dexInput}
                onChange={(e) => setDexInput(parseInt(e.target.value) || 0)}
                placeholder="DEX"
                className="text-gray-500 w-full p-2 border rounded"
                min="1"
              />
            </div>
            <div>
              <label className="text-gray-500 block text-sm font-medium mb-1">
                Init Modifier
              </label>
              <input
                type="number"
                value={modInput}
                onChange={(e) => setModInput(parseInt(e.target.value) || 0)}
                placeholder="Init Mod"
                className="text-gray-500 w-full p-2 border rounded"
                title="Auto-calculated from DEX but can be modified"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isPC}
                onChange={() => setIsPC(!isPC)}
                className="mr-2"
              />
              <label className="text-gray-500 text-sm">Player Character</label>
            </div>
            <button
              onClick={handleAddCombatant}
              disabled={!nameInput}
              className="w-full bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              Add Combatant
            </button>
          </div>
        </div>

        {/* Center column - Combatant list and actions */}
        <div className="w-1/2 flex flex-col overflow-hidden border-r border-gray-300">
          {/* Center column header */}
          <div className="bg-indigo-500 p-3 border-b border-gray-300 flex justify-between items-center min-h-[50px]">
            <div className="flex items-center">
              <span className="font-bold mr-2">Round: {roundCount}</span>
              <button
                onClick={newRound}
                className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700 transition-colors text-sm mr-4"
              >
                New Round (+8 Initiative)
              </button>
              <button
                onClick={rollAllInitiative}
                className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700 transition-colors text-sm"
              >
                Roll Starting Initiative
              </button>
            </div>
            <button
              onClick={resetTracker}
              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors text-sm"
            >
              Reset Tracker
            </button>
          </div>

          {/* Combatant List */}
          <div className="overflow-y-auto flex-1">
            {combatants.length === 0 ? (
              <div className="text-gray-500 p-8 text-center text-gray-500">
                <p>
                  No combatants added yet. Add characters and monsters in the panel on the left.
                </p>
              </div>
            ) : (
              <ul>
                {combatants.map((combatant, index) => (
                  <li
                    key={combatant.id}
                    className={`border-b border-gray-200 p-3 ${
                      combatant.isPC ? "bg-blue-50" : "bg-amber-50"
                    } ${activeIndex === index ? "ring-2 ring-indigo-500" : ""}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex flex-1 items-center">
                        <div className="mr-3 w-12 h-12 flex items-center justify-center bg-indigo-600 text-white text-xl font-bold rounded-full">
                          {combatant.initiative}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="text-gray-500 font-bold text-lg">
                              {combatant.name}
                            </h3>
                            <span
                              className="text-gray-500 ml-2 px-2 py-0.5 bg-gray-200 text-xs rounded-full"
                              title="Dexterity Score"
                            >
                              DEX: {combatant.dexterity} (
                              {combatant.modifier >= 0 ? "+" : ""}
                              {combatant.modifier})
                            </span>
                            {combatant.hasHaste && (
                              <span className="text-gray-400 ml-2 px-2 py-0.5 bg-yellow-200 text-xs rounded-full">
                                Haste
                              </span>
                            )}
                            {combatant.exhaustion > 0 && (
                              <span className="ml-2 px-2 py-0.5 bg-red-600 text-xs rounded-full">
                                Exhaustion: {combatant.exhaustion}
                              </span>
                            )}
                          </div>
                          {combatant.notes && (
                            <p className="text-sm text-gray-600 mt-1">
                              {combatant.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => toggleActive(index, combatant.id)}
                          className={`px-3 py-1 rounded text-sm ${
                            activeIndex === index
                              ? "bg-indigo-600 text-white"
                              : "bg-indigo-500 text-indigo-800 hover:bg-indigo-700"
                          }`}
                        >
                          {activeIndex === index ? "Cancel" : "Act"}
                        </button>
                        <button
                          onClick={() => removeCombatant(combatant.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Remove from combat"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {activeIndex === index && (
                      <div className="mt-3 p-3 bg-white rounded shadow-sm">
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-gray-500 font-bold">Take Action</h4>
                            <div>
                              <button
                                onClick={() =>
                                  setIsInterruptMode(!isInterruptMode)
                                }
                                className={`px-3 py-1 rounded text-sm ${
                                  isInterruptMode
                                    ? "bg-purple-600 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                }`}
                              >
                                {isInterruptMode
                                  ? "Interrupting (+2)"
                                  : "Interrupt Mode"}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => takeAction(combatant.id, 6)}
                              className="px-3 py-1 bg-indigo-500 hover:bg-indigo-700 rounded text-sm"
                            >
                              Action ({isInterruptMode ? 8 : 6})
                            </button>
                            <button
                              onClick={() => takeAction(combatant.id, 3)}
                              className="px-3 py-1 bg-indigo-500 hover:bg-indigo-700 rounded text-sm"
                            >
                              Bonus Action ({isInterruptMode ? 5 : 3})
                            </button>
                            <button
                              onClick={() => takeAction(combatant.id, 3, true)}
                              className="px-3 py-1 bg-indigo-500 hover:bg-indigo-700 rounded text-sm"
                            >
                              Reaction (3)
                            </button>
                            <button
                              onClick={() => takeAction(combatant.id, 3, true)}
                              className="px-3 py-1 bg-indigo-500 hover:bg-indigo-700 rounded text-sm"
                            >
                              Dodge (3)
                            </button>
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <p className="text-gray-400 text-sm font-medium">Movement:</p>
                            <button
                              onClick={() => takeAction(combatant.id, 1)}
                              className="px-3 py-1 bg-green-400 hover:bg-green-600 rounded text-sm"
                            >
                              5ft ({isInterruptMode ? 3 : 1})
                            </button>
                            <button
                              onClick={() => takeAction(combatant.id, 2)}
                              className="px-3 py-1 bg-green-400 hover:bg-green-600 rounded text-sm"
                            >
                              Half Speed ({isInterruptMode ? 4 : 2})
                            </button>
                            <button
                              onClick={() => takeAction(combatant.id, 3)}
                              className="px-3 py-1 bg-green-400 hover:bg-green-600 rounded text-sm"
                            >
                              Full Speed ({isInterruptMode ? 5 : 3})
                            </button>
                            <button
                              onClick={() => takeAction(combatant.id, 6)}
                              className="px-3 py-1 bg-green-400 hover:bg-green-600 rounded text-sm"
                            >
                              Double Speed ({isInterruptMode ? 8 : 6})
                            </button>
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <p className="text-gray-400 text-sm font-medium">Attack:</p>
                            <button
                              onClick={() => takeAction(combatant.id, 6)}
                              className="px-3 py-1 bg-red-400 hover:bg-red-600 rounded text-sm"
                            >
                              Standard ({isInterruptMode ? 8 : 6})
                            </button>
                            <button
                              onClick={() => takeAction(combatant.id, 3)}
                              className="px-3 py-1 bg-red-400 hover:bg-red-600 rounded text-sm"
                            >
                              2 Attacks ({isInterruptMode ? 5 : 3} each)
                            </button>
                            <button
                              onClick={() => takeAction(combatant.id, 2)}
                              className="px-3 py-1 bg-red-400 hover:bg-red-600 rounded text-sm"
                            >
                              3 Attacks ({isInterruptMode ? 4 : 2} each)
                            </button>
                            <button
                              onClick={() => takeAction(combatant.id, 1)}
                              className="px-3 py-1 bg-red-400 hover:bg-red-600 rounded text-sm"
                            >
                              4 Attacks ({isInterruptMode ? 3 : 1} each)
                            </button>
                          </div>
                          <div className="mt-2 flex items-center space-x-2">
                            <label className="text-gray-400 text-sm font-medium">
                              Custom:
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="25"
                              value={actionCost || ""}
                              onChange={(e) =>
                                setActionCost(
                                  e.target.value ? parseInt(e.target.value) : ""
                                )
                              }
                              className="text-gray-400 w-16 px-2 py-1 border rounded"
                            />
                            <button
                              onClick={() =>
                                takeAction(combatant.id, actionCost)
                              }
                              disabled={
                                !actionCost ||
                                combatant.initiative <
                                  (isInterruptMode
                                    ? parseInt(actionCost) + 2
                                    : actionCost)
                              }
                              className="px-3 py-1 bg-indigo-600 text-white rounded text-sm disabled:bg-gray-400"
                            >
                              Take Action {isInterruptMode ? `(+2)` : ""}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <h4 className="text-gray-500 font-bold mb-2">Adjustments</h4>
                            <div className="flex space-x-2">
                              <button
                                onClick={() =>
                                  adjustInitiative(combatant.id, -1)
                                }
                                className="text-gray-600 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                              >
                                Initiative -1
                              </button>
                              <button
                                onClick={() =>
                                  adjustInitiative(combatant.id, 1)
                                }
                                className="text-gray-600 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                              >
                                Initiative +1
                              </button>
                              <button
                                onClick={() => overexert(combatant.id)}
                                disabled={combatant.hasOverexerted}
                                className="px-2 py-1 bg-red-500 text-white hover:bg-red-600 rounded text-sm disabled:bg-gray-400"
                                title="Gain +8 initiative and +1 exhaustion (once per round)"
                              >
                                Overexert
                              </button>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-gray-600 font-bold mb-2">Status</h4>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => toggleHaste(combatant.id)}
                                className={`text-gray-500 px-2 py-1 rounded text-sm ${
                                  combatant.hasHaste
                                    ? "bg-yellow-200 hover:bg-yellow-300"
                                    : "bg-gray-200 hover:bg-gray-300"
                                }`}
                                title="Double initiative gain each round"
                              >
                                {combatant.hasHaste
                                  ? "Remove Haste"
                                  : "Add Haste"}
                              </button>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() =>
                                    adjustExhaustion(combatant.id, -1)
                                  }
                                  disabled={combatant.exhaustion === 0}
                                  className="text-gray-500 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm disabled:bg-gray-100"
                                >
                                  -
                                </button>
                                <span className="text-gray-400 text-sm">
                                  Exhaustion: {combatant.exhaustion}
                                </span>
                                <button
                                  onClick={() =>
                                    adjustExhaustion(combatant.id, 1)
                                  }
                                  className="text-gray-500 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <label className="text-gray-400 block text-sm font-medium mb-1">
                            Notes
                          </label>
                          <textarea
                            value={combatant.notes}
                            onChange={(e) =>
                              updateNotes(combatant.id, e.target.value)
                            }
                            className="text-gray-400 w-full p-2 border rounded h-16 text-sm"
                            placeholder="Add notes about conditions, spells, etc."
                          />
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick Reference */}
          <div
              className="border-t border-gray-300 p-3 bg-white overflow-y-auto"
              style={{ maxHeight: "30%" }}
            >
              <h3 className="text-gray-400 font-bold mb-2">Quick Reference</h3>
              <div className="text-gray-400 text-xs space-y-1">
                <p>
                  <strong>Initiative Costs:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Action: 6 Initiative</li>
                  <li>Bonus Action/Reaction: 3 Initiative</li>
                  <li>Interact with Object: 2 Initiative</li>
                  <li>
                    Movement: 5ft (1), Half Speed (2), Full Speed (3), Double
                    Speed (6)
                  </li>
                  <li>
                    Extra Attack: 2 attacks (3 each), 3 attacks (2 each), 4
                    attacks (1 each)
                  </li>
                  <li>Interrupting: +2 to action cost</li>
                  <li>Dodge: 3 Initiative (no interrupt cost)</li>
                </ul>
                <p className="mt-2">
                  <strong>Rules:</strong> Max Initiative 25, Overexert once per
                  round (+8 init, +1 exhaustion)
                </p>
              </div>
            </div>
        </div>

        {/* Right panel - Combat log */}
        <div className="w-1/4 flex flex-col bg-gray-50 overflow-hidden">
          <div className="bg-indigo-500 p-3 border-b border-gray-300 flex justify-between items-center min-h-[53px]">
            <h2 className="font-bold">Combat Log</h2>
            <button
              onClick={clearHistory}
              className="text-sm text-gray-300 hover:text-gray-400"
            >
              Clear
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-3">
            {history.length === 0 ? (
              <p className="text-gray-500 text-center">
                Combat actions will appear here
              </p>
            ) : (
              <ul className="space-y-1">
                {history.map((entry, index) => (
                  <li
                    key={index}
                    className={`text-gray-400 text-sm p-1 ${
                      entry.startsWith("--")
                        ? "font-bold bg-indigo-50 p-1 rounded border-l-4 border-indigo-600"
                        : ""
                    }`}
                  >
                    {entry}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
