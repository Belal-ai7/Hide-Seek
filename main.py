"""
Flask API Server for the Simplex Solver
========================================
Exposes endpoints for solving the payoff matrix and playing the hide-and-seek game.

Run:
    python main.py
"""

import os
import sys
import random
from flask import Flask, request, jsonify
from flask_cors import CORS


app = Flask(__name__)

# Allow the Angular dev server (http://localhost:4200) to call our API.
# Without CORS the browser blocks cross-origin requests.
CORS(app)

# Ensure the backend can import the solver module from src/back.
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "src", "back")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from solver import HideAndSeekGame


# Global game state (for simplicity; use sessions or DB for production)
game_state = {
    "player_score": 0,
    "computer_score": 0,
    "rounds_won_player": 0,
    "rounds_won_computer": 0,
    "total_rounds": 0,
    # FIX: Store the payoff matrix here so it stays consistent across all rounds.
    # Previously, /api/play and /api/simulate each created a new HideAndSeekGame,
    # re-randomizing place types every single call. Now the matrix is set once by
    # /api/solve and reused until /api/reset clears it.
    "payoff_matrix": None,
    "num_places": None,
}


def error_response(message, status_code=400):
    return jsonify({"status": "error", "message": message}), status_code


@app.route("/api/solve", methods=["POST"])
def solve():
    global game_state
    data = request.get_json(silent=True)
    if data is None:
        return error_response("Invalid or missing JSON body.")

    num_places = data.get("num_places")
    player_role = data.get("player_role")          # ← read from request

    if not isinstance(num_places, int) or num_places <= 0:
        return error_response("Field 'num_places' must be a positive integer.")
    if player_role not in {"hider", "seeker"}:
        return error_response("Field 'player_role' must be 'hider' or 'seeker'.")
    computer_role = "seeker" if player_role == "hider" else "hider"

    game = HideAndSeekGame(num_places)
    payoff_matrix = game.payoff_matrix
    optimal_strategy, game_value = game.solve_payoff_matrix(payoff_matrix, role=player_role)  

    game_state["payoff_matrix"] = payoff_matrix
    game_state["num_places"] = num_places

    result = {
        "status": "ok",
        "num_places": num_places,
        "payoff_matrix": payoff_matrix,
        "probabilities": optimal_strategy,
        "game_value": game_value,
        "computer_role": computer_role,
    }
    return jsonify(result)


@app.route("/api/play", methods=["POST"])
def play():
    global game_state
    data = request.get_json(silent=True)
    if data is None:
        return error_response("Invalid or missing JSON body.")

    role = data.get("role")
    place = data.get("place")
    num_places = data.get("num_places")

    if role not in {"hider", "seeker"}:
        return error_response("Field 'role' must be 'hider' or 'seeker'.")
    if not isinstance(place, int):
        return error_response("Field 'place' must be an integer.")
    if not isinstance(num_places, int) or num_places <= 0:
        return error_response("Field 'num_places' must be a positive integer.")
    if place < 0 or place >= num_places:
        return error_response(f"Field 'place' must be between 0 and {num_places - 1}.")

    # FIX: Reuse the stored payoff matrix. If /api/solve hasn't been called yet
    # (or the world size changed), fall back to creating a new game and storing it.
    stored_matrix = game_state.get("payoff_matrix")
    stored_num_places = game_state.get("num_places")

    if stored_matrix is None or stored_num_places != num_places:
        game = HideAndSeekGame(num_places)
        game_state["payoff_matrix"] = game.payoff_matrix
        game_state["num_places"] = num_places

    payoff_matrix = game_state["payoff_matrix"]

    result = HideAndSeekGame.play_game(place, role, num_places, payoff_matrix)
    game_state["total_rounds"] += 1
    if result["winner"] == role:
        game_state["player_score"] += result["your_score"]
        game_state["rounds_won_player"] += 1
    else:
        game_state["computer_score"] += result["opponent_score"]
        game_state["rounds_won_computer"] += 1

    result.update({k: v for k, v in game_state.items() if k not in ("payoff_matrix", "num_places")})
    result["status"] = "ok"
    return jsonify(result)


@app.route("/api/simulate", methods=["POST"])
def simulate():
    global game_state
    data = request.get_json(silent=True)
    if data is None:
        return error_response("Invalid or missing JSON body.")

    num_places = data.get("num_places")
    num_rounds = data.get("num_rounds", 100)
    player_role = data.get("player_role", "hider")  # FIX: read role from request

    if not isinstance(num_places, int) or num_places <= 0:
        return error_response("Field 'num_places' must be a positive integer.")
    if not isinstance(num_rounds, int) or num_rounds <= 0:
        return error_response("Field 'num_rounds' must be a positive integer.")
    if player_role not in {"hider", "seeker"}:
        return error_response("Field 'player_role' must be 'hider' or 'seeker'.")

    # FIX: Same as /api/play — reuse the stored matrix.
    stored_matrix = game_state.get("payoff_matrix")
    stored_num_places = game_state.get("num_places")

    if stored_matrix is None or stored_num_places != num_places:
        game = HideAndSeekGame(num_places)
        game_state["payoff_matrix"] = game.payoff_matrix
        game_state["num_places"] = num_places

    payoff_matrix = game_state["payoff_matrix"]

    sim_result = HideAndSeekGame.simulate_game(num_places, payoff_matrix, num_rounds, player_role)
    game_state["total_rounds"] += num_rounds
    game_state["player_score"] += sim_result["player_score"]
    game_state["computer_score"] += sim_result["computer_score"]
    game_state["rounds_won_player"] += sim_result["rounds_won_player"]
    game_state["rounds_won_computer"] += sim_result["rounds_won_computer"]

    result = {"status": "ok", **sim_result,
              **{k: v for k, v in game_state.items() if k not in ("payoff_matrix", "num_places")}}
    return jsonify(result)


@app.route("/api/reset", methods=["POST"])
def reset():
    global game_state
    # FIX: Clear the stored matrix on reset so the next /api/solve starts fresh.
    game_state = {
        "player_score": 0,
        "computer_score": 0,
        "rounds_won_player": 0,
        "rounds_won_computer": 0,
        "total_rounds": 0,
        "payoff_matrix": None,
        "num_places": None,
    }
    return jsonify({"status": "ok", "message": "Game reset.",
                    **{k: v for k, v in game_state.items() if k not in ("payoff_matrix", "num_places")}})


@app.route("/api/state", methods=["GET"])
def get_state():
    return jsonify({"status": "ok",
                    **{k: v for k, v in game_state.items() if k not in ("payoff_matrix", "num_places")}})


if __name__ == "__main__":
    print("=" * 50)
    print("  Simplex Solver API running on http://localhost:5000")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000, debug=True)